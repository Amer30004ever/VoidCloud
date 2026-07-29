import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { MailerModule } from './mailer/mailer.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TosModule } from './tos/tos.module';
import { DeletionModule } from './deletion/deletion.module';
import { OidcProviderModule } from './oidc/oidc-provider.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailerModule,
    AuthModule,
    TosModule,
    DeletionModule,
    OidcProviderModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
