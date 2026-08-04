import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { assertNotRevoked } from '../common/token-revocation';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Cross-service JWT revocation check. Enforces /auth/logout and
    // /auth/admin/users/:id/revoke-sessions at THIS service's boundary,
    // not just at services/auth. See shared/auth/token-revocation.ts for
    // the fail-closed-on-Redis / fail-open-on-introspect policy.
    try {
      await assertNotRevoked({ jti: payload.jti, sub: payload.sub, iat: payload.iat });
    } catch (e: any) {
      throw new UnauthorizedException(e?.message || 'Token has been revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const { password: _, ...result } = user;
    return { ...result, jti: payload.jti, exp: payload.exp, iat: payload.iat, impersonatedBy: payload.impersonatedBy };
  }
}
