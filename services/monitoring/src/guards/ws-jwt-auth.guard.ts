import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const handshake = client.handshake ?? {};
    const auth = (handshake.auth ?? {}) as Record<string, string>;
    const token = auth.token || (handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) throw new BadRequestException('Missing token');

    try {
      const payload = this.jwtService.verify(token, { secret: this.configService.get<string>('JWT_SECRET') || 'fallback_secret' });
      client.data.user = payload;
      return true;
    } catch {
      throw new BadRequestException('Invalid token');
    }
  }
}
