import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { CrmModule } from './crm/crm.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WhatsappBroadcastModule } from './whatsapp-broadcast/whatsapp-broadcast.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
    CrmModule,
    HealthModule,
    WhatsappBroadcastModule,
  ],
  controllers: [HealthController],
  providers: [JwtStrategy, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
