import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RbacModule } from '../rbac/rbac.module';
import { TwoFactorService } from './cloud-auth/two-factor.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      // No fallback — main.ts validates JWT_SECRET is present at boot and exits if missing.
      secret: process.env.JWT_SECRET as string,
      signOptions: { expiresIn: '7d' },
    }),
    RbacModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TwoFactorService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
