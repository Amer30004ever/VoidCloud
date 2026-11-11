import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CicdProvider, DeployRunStatus, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret } from '../../../../shared/crypto/crypto.util';
import { branchFromRef, verifyDeploySignature } from './cicd-signature';

type Actor = { id: string; role: Role | string };

export interface UpdateCicdInput {
  provider?: CicdProvider;
  repository?: string | null;
  autoDeployBranch?: string;
  autoDeploy?: boolean;
  prPreview?: boolean;
  buildCommand?: string | null;
  deployCommand?: string | null;
  accessToken?: string | null;
}

const REPO_RE = /^[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)+$/;
const BRANCH_RE = /^[A-Za-z0-9._\/-]{1,100}$/;

@Injectable()
export class VpsCicdService {
  private readonly logger = new Logger(VpsCicdService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** Tenant-scoped VPS lookup; 404 (no existence oracle) on foreign rows. */
  private async owned(vpsId: string, user: Actor) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps || (user.role !== Role.SUPER_ADMIN && vps.userId !== user.id)) {
      throw new NotFoundException('VPS not found');
    }
    return vps;
  }

  private present(cfg: any, revealSecret = false) {
    const { webhookSecretCipher, accessTokenCipher, ...rest } = cfg;
    return {
      ...rest,
      hasAccessToken: !!accessTokenCipher,
      webhookPath: `/api/v1/public/deploy/${cfg.webhookToken}`,
      ...(revealSecret ? { webhookSecret: decryptSecret(webhookSecretCipher) } : {}),
    };
  }

  async get(vpsId: string, user: Actor) {
    const vps = await this.owned(vpsId, user);
    let cfg = await this.prisma.vpsCicdConfig.findUnique({ where: { vpsId } });
    if (!cfg) {
      cfg = await this.prisma.vpsCicdConfig.create({
        data: {
          vpsId,
          userId: vps.userId,
          webhookToken: randomBytes(24).toString('hex'),
          webhookSecretCipher: encryptSecret(randomBytes(32).toString('hex')),
        },
      });
      return this.present(cfg, true);
    }
    return this.present(cfg);
  }

  async update(vpsId: string, input: UpdateCicdInput, user: Actor) {
    await this.get(vpsId, user);
    if (input.repository && !REPO_RE.test(input.repository)) {
      throw new BadRequestException('repository must look like owner/repo');
    }
    if (input.autoDeployBranch !== undefined && !BRANCH_RE.test(input.autoDeployBranch)) {
      throw new BadRequestException('invalid branch name');
    }
    if (input.provider && !Object.values(CicdProvider).includes(input.provider)) {
      throw new BadRequestException('unknown provider');
    }
    const data: Record<string, unknown> = {};
    for (const k of ['provider', 'repository', 'autoDeployBranch', 'autoDeploy', 'prPreview', 'buildCommand', 'deployCommand'] as const) {
      if (input[k] !== undefined) data[k] = input[k];
    }
    if (input.accessToken !== undefined) {
      data.accessTokenCipher = input.accessToken ? encryptSecret(input.accessToken) : null;
    }
    const cfg = await this.prisma.vpsCicdConfig.update({ where: { vpsId }, data });
    return this.present(cfg);
  }

  /** Rotates both the URL token and the signing secret; old webhooks stop working. */
  async regenerate(vpsId: string, user: Actor) {
    await this.get(vpsId, user);
    const cfg = await this.prisma.vpsCicdConfig.update({
      where: { vpsId },
      data: {
        webhookToken: randomBytes(24).toString('hex'),
        webhookSecretCipher: encryptSecret(randomBytes(32).toString('hex')),
      },
    });
    return this.present(cfg, true);
  }

  async runs(vpsId: string, user: Actor, limit = 20) {
    await this.owned(vpsId, user);
    return this.prisma.vpsDeployRun.findMany({
      where: { vpsId },
      orderBy: { startedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async triggerManual(vpsId: string, user: Actor, ref?: string) {
    const cfg = await this.get(vpsId, user);
    return this.enqueue(vpsId, user.id, cfg.provider, { ref: ref ?? cfg.autoDeployBranch, trigger: 'manual' });
  }

  /**
   * Public webhook entry. Caller is authenticated solely by the signature
   * over the raw body (or GitLab token). Unknown token and bad signature both
   * return 401 so the endpoint cannot be used to enumerate tokens.
   */
  async handleWebhook(token: string, rawBody: string, headers: Record<string, string | undefined>) {
    const cfg = await this.prisma.vpsCicdConfig.findUnique({ where: { webhookToken: token } });
    const ok = !!cfg && verifyDeploySignature({
      secret: decryptSecret(cfg.webhookSecretCipher),
      rawBody,
      signature: headers['x-hub-signature-256'] ?? headers['x-voidcloud-signature'],
      gitlabToken: headers['x-gitlab-token'],
    });
    if (!cfg || !ok) throw new UnauthorizedException('Invalid webhook signature');

    let payload: any = {};
    try { payload = rawBody ? JSON.parse(rawBody) : {}; } catch { throw new BadRequestException('Body must be JSON'); }

    const event = headers['x-github-event'] ?? headers['x-gitlab-event'] ?? 'push';
    const isPr = /pull_request|merge request/i.test(event);
    if (isPr) {
      if (!cfg.prPreview) return { accepted: false, reason: 'PR previews disabled' };
      const num = payload.number ?? payload.object_attributes?.iid;
      return this.enqueue(cfg.vpsId, cfg.userId, cfg.provider, {
        ref: `pr-${num ?? 'unknown'}`, trigger: 'pr-preview',
        commitSha: payload.pull_request?.head?.sha ?? payload.object_attributes?.last_commit?.id,
      });
    }

    const branch = branchFromRef(payload.ref) ?? cfg.autoDeployBranch;
    const manualCall = !payload.ref; // curl / generic CI with no push payload
    if (!manualCall && (!cfg.autoDeploy || branch !== cfg.autoDeployBranch)) {
      return { accepted: false, reason: `ignored push to ${branch}` };
    }
    return this.enqueue(cfg.vpsId, cfg.userId, cfg.provider, {
      ref: branch, trigger: 'webhook',
      commitSha: payload.after ?? payload.checkout_sha ?? payload.sha,
      message: payload.head_commit?.message ?? payload.commits?.[0]?.message,
    });
  }

  private async enqueue(vpsId: string, userId: string, provider: CicdProvider,
    run: { ref?: string; trigger: string; commitSha?: string; message?: string }) {
    const created = await this.prisma.vpsDeployRun.create({
      data: {
        vpsId, userId, provider, status: DeployRunStatus.QUEUED,
        ref: run.ref?.slice(0, 200), trigger: run.trigger,
        commitSha: run.commitSha?.slice(0, 64), message: run.message?.slice(0, 500),
      },
    });
    await this.prisma.vpsCicdConfig.update({ where: { vpsId }, data: { lastTriggeredAt: new Date() } }).catch(() => undefined);
    await this.prisma.cloudDeployment.update({ where: { id: vpsId }, data: { lastDeployedAt: new Date() } }).catch(() => undefined);
    this.logger.log(`deploy run ${created.id} queued for vps ${vpsId} (${run.trigger})`);
    return { accepted: true, run: created };
  }
}
