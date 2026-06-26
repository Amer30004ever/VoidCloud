import { Module } from '@nestjs/common';
import { RateLimitingController } from './rate-limiting.controller';
import { RateLimitingService } from './rate-limiting.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RateLimitingController],
  providers: [RateLimitingService],
  exports: [RateLimitingService],
})
export class RateLimitingModule {}
