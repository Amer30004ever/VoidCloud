import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaServiceLike } from '../prisma/prisma.service';

@Injectable()
export class ApiUsageMiddleware implements NestMiddleware {
  private buffer: any[] = [];
  private flushing = false;

  constructor(private readonly prisma: PrismaServiceLike) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const originalSend = res.send.bind(res);

    res.send = function (body: any) {
      const responseMs = Date.now() - start;
      const userId = (req as any).user?.id as string | undefined;
      const tenantId = (req as any).user?.tenantId as string | undefined;
      const endpoint = (req as any).route?.path || req.url || 'unknown';

      if (userId) {
        (req as any).__apiUsageRecord = {
          userId,
          tenantId,
          endpoint,
          method: req.method,
          statusCode: res.statusCode,
          responseMs,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.socket.remoteAddress,
        };
      }

      return originalSend(body);
    };

    res.on('finish', () => {
      const record = (req as any).__apiUsageRecord;
      if (!record) return;

      this.buffer.push(record);
      if (this.buffer.length >= 10 && !this.flushing) {
        this.flush();
      }
    });

    next();
  }

  private async flush() {
    this.flushing = true;
    const batch = this.buffer.splice(0, this.buffer.length);
    if (batch.length === 0) {
      this.flushing = false;
      return;
    }

    try {
      await this.prisma.apiUsageLog.createMany({ data: batch });
    } catch {
      // ignore analytics write failures
    } finally {
      this.flushing = false;
      if (this.buffer.length > 0) {
        setTimeout(() => this.flush(), 100);
      }
    }
  }
}
