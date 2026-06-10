import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PrismaModule } from '../prisma/prisma.module';
import { KubernetesModule } from '../kubernetes/kubernetes.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [PrismaModule, KubernetesModule, StatsModule],
  controllers: [PlatformController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
