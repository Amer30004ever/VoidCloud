import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './cloud-auth/google.strategy';
import { GitHubStrategy } from './cloud-auth/github.strategy';
import { RbacModule } from '../rbac/rbac.module';
import { TwoFactorService } from './cloud-auth/two-factor.service';
import { TokenRevocationService } from './token-revocation.service';
import { TenantIsolationService } from '../rbac/tenant-isolation.service';
import { BillingModule } from '../../../billing/src/billing/billing.module';
import { TosModule } from '../tos/tos.module';
import { DeletionModule } from '../deletion/deletion.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'fallback_secret',
      signOptions: { expiresIn: '7d' },
    }),
    RbacModule,
    BillingModule,
    TosModule,
    DeletionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, GitHubStrategy, TwoFactorService, TokenRevocationService, TenantIsolationService],
  exports: [AuthService, JwtModule, TokenRevocationService],
})
export class AuthModule {}
