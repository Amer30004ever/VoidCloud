import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { RecommendationScheduler } from './recommendation.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecommendationController],
  providers: [RecommendationService, RecommendationScheduler],
  exports: [RecommendationService],
})
export class RecommendationModule {}
