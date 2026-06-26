import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudDeploymentsService } from '../cloud-deployments.service';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

interface Session {
  proc: ChildProcessWithoutNullStreams;
  userId: string;
  deploymentId: string;
  idleTimer: NodeJS.Timeout;
  lineBuf: string;
}

/**
 * VPS interactive terminal over Socket.IO.
 *
 * Auth: JWT in handshake.auth.token (or ?token=). Verifies ownership of
 * the target deployment, rate-limits new sessions (5/min/user), tracks
 * idle activity (15 min auto-disconnect), and audits every command line.
 *
 * Backend exec strategy:
 *   - If PROXMOX_SSH_HOST is set → ssh -tt root@<host> pct exec <vmid> -- /bin/bash
 *   - Else (dev/stub) → local /bin/sh -i
 *
 * No public IP required: the client connects to the existing backend
 * Socket.IO endpoint over HTTPS via the Cloudflare tunnel.
 */
@WebSocketGateway({
  namespace: '/vps-terminal',
  cors: { origin: '*' },
})
export class VpsTerminalGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(VpsTerminalGateway.name);
  private readonly sessions = new Map<string, Session>();
  private readonly userOpenCounts = new Map<string, number[]>();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly deployments: CloudDeploymentsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) throw new Error('No auth token');
      const payload: any = this.jwt.verify(token);
      const userId = payload.sub ?? payload.id;
      if (!userId) throw new Error('Bad token payload');

      const deploymentId =
        (client.handshake.auth?.deploymentId as string) ||
        (client.handshake.query?.deploymentId as string);
      if (!deploymentId) throw new Error('deploymentId required');

      // Rate limit
      const now = Date.now();
      const recent = (this.userOpenCounts.get(userId) ?? []).filter(
        (t) => now - t < RATE_LIMIT_WINDOW_MS,
      );
      if (recent.length >= RATE_LIMIT_MAX) {
        client.emit(
          'output',
          `\r\n\x1b[31mRate limit exceeded: ${RATE_LIMIT_MAX} terminal sessions per minute.\x1b[0m\r\n`,
        );
        client.disconnect(true);
        return;
      }
      recent.push(now);
      this.userOpenCounts.set(userId, recent);

      // Ownership + suspension check
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');
      if (user.suspendedAt) {
        client.emit(
          'output',
          '\r\n\x1b[31mAccount suspended — terminal access disabled.\x1b[0m\r\n',
        );
        client.disconnect(true);
        return;
      }
      const deployment = await this.deployments.get(userId, deploymentId);
      if (!deployment) throw new Error('Deployment not found');

      const proc = this.spawnSession(deployment);
      const session: Session = {
        proc,
        userId,
        deploymentId,
        lineBuf: '',
        idleTimer: setTimeout(
          () => this.endSession(client, 'idle'),
          IDLE_TIMEOUT_MS,
        ),
      };
      this.sessions.set(client.id, session);

      proc.stdout.on('data', (chunk: Buffer) =>
        client.emit('output', chunk.toString('utf8')),
      );
      proc.stderr.on('data', (chunk: Buffer) =>
        client.emit('output', chunk.toString('utf8')),
      );
      proc.on('exit', (code) => {
        client.emit(
          'output',
          `\r\n\x1b[33m[session exited code=${code}]\x1b[0m\r\n`,
        );
        client.disconnect(true);
      });

      client.emit('ready', { deploymentId });
      this.logger.log(
        `Terminal opened user=${userId} deployment=${deploymentId} client=${client.id}`,
      );
    } catch (e: any) {
      this.logger.warn(`Terminal connect rejected: ${e.message}`);
      client.emit('output', `\r\n\x1b[31m${e.message}\x1b[0m\r\n`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.endSession(client, 'disconnect');
  }

  @SubscribeMessage('input')
  onInput(@ConnectedSocket() client: Socket, @MessageBody() data: string) {
    const s = this.sessions.get(client.id);
    if (!s || typeof data !== 'string') return;
    this.resetIdle(client, s);
    s.proc.stdin.write(data);
    // Audit on line boundaries.
    s.lineBuf += data;
    let idx: number;
    while ((idx = s.lineBuf.indexOf('\n')) >= 0) {
      const line = s.lineBuf.slice(0, idx).replace(/\r$/, '').trim();
      s.lineBuf = s.lineBuf.slice(idx + 1);
      if (line) {
        void this.prisma.cloudAuditLog
          .create({
            data: {
              adminId: s.userId,
              action: 'TERMINAL_CMD',
              targetId: s.deploymentId,
              newValue: { cmd: line.slice(0, 500) },
              ipAddress: client.handshake.address,
            },
          })
          .catch(() => undefined);
      }
    }
  }

  @SubscribeMessage('resize')
  onResize(
    @ConnectedSocket() client: Socket,
    @MessageBody() size: { cols: number; rows: number },
  ) {
    const s = this.sessions.get(client.id);
    if (!s || !size) return;
    // Without a real PTY we can't send SIGWINCH; record for protocol completeness.
    // node-pty would be required for full resize support; using stty as best-effort.
    try {
      s.proc.stdin.write(
        `stty cols ${Math.max(1, Math.min(500, size.cols | 0))} rows ${Math.max(1, Math.min(200, size.rows | 0))} 2>/dev/null\n`,
      );
    } catch {
      /* ignore */
    }
  }

  private resetIdle(client: Socket, s: Session) {
    clearTimeout(s.idleTimer);
    s.idleTimer = setTimeout(
      () => this.endSession(client, 'idle'),
      IDLE_TIMEOUT_MS,
    );
  }

  private endSession(client: Socket, reason: string) {
    const s = this.sessions.get(client.id);
    if (!s) return;
    clearTimeout(s.idleTimer);
    try {
      s.proc.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    this.sessions.delete(client.id);
    this.logger.log(`Terminal closed user=${s.userId} reason=${reason}`);
    if (reason === 'idle') {
      try {
        client.emit(
          'output',
          '\r\n\x1b[33m[disconnected — idle 15m]\x1b[0m\r\n',
        );
      } catch {
        /* ignore */
      }
      try {
        client.disconnect(true);
      } catch {
        /* ignore */
      }
    }
  }

  private spawnSession(deployment: {
    proxmoxVMID?: number | null;
    proxmoxNode?: string | null;
    hostname?: string | null;
  }): ChildProcessWithoutNullStreams {
    const sshHost = process.env.PROXMOX_SSH_HOST;
    const sshUser = process.env.PROXMOX_SSH_USER || 'root';
    if (sshHost && deployment.proxmoxVMID) {
      const args = [
        '-tt',
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'UserKnownHostsFile=/dev/null',
        `${sshUser}@${sshHost}`,
        'pct',
        'exec',
        String(deployment.proxmoxVMID),
        '--',
        '/bin/bash',
        '-i',
      ];
      this.logger.log(
        `spawning ssh pct exec for vmid=${deployment.proxmoxVMID}`,
      );
      return spawn('ssh', args, { env: process.env });
    }
    // Dev/stub fallback: local shell so the UI is testable without Proxmox.
    const banner = `echo "[STUB] VPS terminal for ${deployment.hostname ?? 'demo'} (no Proxmox configured)"; PS1='vps$ '; exec /bin/sh -i`;
    return spawn('/bin/sh', ['-c', banner], {
      env: { ...process.env, TERM: 'xterm-256color' },
    });
  }
}
