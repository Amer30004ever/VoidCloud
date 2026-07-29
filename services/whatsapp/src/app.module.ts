import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { CrashLoopModule } from './crashloop/crash-loop.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), CrashLoopModule],
  controllers: [HealthController],
})
export class AppModule {}
