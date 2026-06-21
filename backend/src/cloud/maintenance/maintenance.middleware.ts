import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { MaintenanceService } from './maintenance.service';

// Routes that always work, even during maintenance.
const ALLOWLIST = [
  /^\/api\/v1\/status/,
  /^\/api\/v1\/cloud\/admin\//,
  /^\/api\/v1\/auth\//,
  /^\/api\/v1\/healthz?/,
  /^\/docs/,
];

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(
    private maintenance: MaintenanceService,
    private jwt: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'GET' && req.path.startsWith('/api/v1/status')) return next();
    const status = await this.maintenance.isMaintenanceMode().catch(() => null);
    if (!status?.active) return next();

    // Allow admins through
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload: any = this.jwt.decode(auth.slice(7));
        if (payload?.role === 'ADMIN' || payload?.role === 'SUPER_ADMIN') return next();
      } catch { /* ignore */ }
    }
    if (ALLOWLIST.some((re) => re.test(req.path))) return next();

    const retryAfterSec = status.endAt
      ? Math.max(1, Math.ceil((status.endAt.getTime() - Date.now()) / 1000))
      : 3600;
    res.setHeader('Retry-After', String(retryAfterSec));
    throw new ServiceUnavailableException({
      message: 'AmerCloud is undergoing scheduled maintenance.',
      maintenance: status,
    });
  }
}
