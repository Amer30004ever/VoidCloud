import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { KubernetesService } from '../kubernetes/kubernetes.service';
import { ClusterService } from '../cluster/cluster.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { MailerService } from '../mailer/mailer.service';

const ADMIN_ROLES = [Role.ADMIN, Role.SUPER_ADMIN] as const;

interface AuthedRequest { user: { id: string; role: Role; email: string } }

/**
 * Admin-only cluster + SMTP diagnostics surface.
 *
 * Exposes flat endpoints under /api/v1/admin/* that delegate to the existing
 * Kubernetes / cluster / mailer services. Read-only and guarded.
 */
@ApiTags('Admin / Cluster')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Roles(...ADMIN_ROLES)
@Controller('admin')
export class AdminClusterController {
  constructor(
    private readonly k8s: KubernetesService,
    private readonly cluster: ClusterService,
    private readonly dashboard: DashboardService,
    private readonly mailer: MailerService,
  ) {}

  @Get('cluster/nodes')
  async nodes() {
    try {
      return await this.cluster.getNodes();
    } catch (e: any) {
      return { nodes: [], error: e?.message ?? 'Kubernetes unavailable' };
    }
  }

  @Get('cluster/namespaces')
  async namespaces(@Query('limit') limit?: string) {
    const data = await this.dashboard.getRunningNamespaces();
    const list = data.namespaces ?? [];
    const cap = Math.max(1, Math.min(parseInt(limit ?? '0', 10) || list.length, 200));
    return {
      total: list.length,
      namespaces: list.slice(0, cap),
    };
  }

  @Get('cluster/pods')
  async pods(@Query('namespace') namespace?: string) {
    try {
      this.k8s.ensureConnected();
      const items = await this.k8s.getPods(namespace);
      const total = items.length;
      const byPhase: Record<string, number> = {};
      for (const p of items) {
        const phase = p?.status?.phase ?? 'Unknown';
        byPhase[phase] = (byPhase[phase] ?? 0) + 1;
      }
      return { total, byPhase };
    } catch (e: any) {
      return { total: 0, byPhase: {}, error: e?.message ?? 'Kubernetes unavailable' };
    }
  }

  @Get('smtp/status')
  smtpStatus() {
    return this.mailer.status();
  }

  @Post('smtp/test')
  async smtpTest(@Req() req: AuthedRequest, @Body() body: { to?: string }) {
    const to = (body?.to || req.user.email || '').trim();
    return this.mailer.sendTest(to);
  }
}
