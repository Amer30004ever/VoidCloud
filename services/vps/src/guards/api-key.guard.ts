import { Injectable, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing API key');
    }

    const rawKey = authHeader.slice(7).trim();
    if (!rawKey.startsWith('vc_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    request.user = {
      id: apiKey.userId,
      email: apiKey.user.email,
      name: apiKey.user.name,
      role: apiKey.user.role,
      apiKey,
      authMethod: 'api_key',
    };

    return true;
  }
}
