import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { assertNotRevoked } from '../../common/token-revocation';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Cross-service JWT revocation check. See shared/auth/token-revocation.ts.
    try {
      await assertNotRevoked({ jti: payload.jti, sub: payload.sub, iat: payload.iat });
    } catch (e: any) {
      throw new UnauthorizedException(e?.message || 'Token has been revoked');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { ...user, jti: payload.jti, iat: payload.iat };
  }
}
