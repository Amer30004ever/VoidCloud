import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenRevocationService } from '../token-revocation.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private revocation: TokenRevocationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Reject tokens whose jti is on the blocklist, OR whose iat is at/before
    // the per-user revocation cutoff (password change / admin-forced revoke).
    if (await this.revocation.isTokenRevoked({ jti: payload.jti, sub: payload.sub, iat: payload.iat })) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const { password: _, ...result } = user;
    // Preserve jti/exp so downstream (e.g. logout handler) can revoke this exact token.
    return { ...result, jti: payload.jti, exp: payload.exp };
  }
}

