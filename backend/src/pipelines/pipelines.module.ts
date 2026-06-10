import { Module } from '@nestjs/common';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';
import { PrismaModule } from '../prisma/prisma.module';
import { KubernetesModule } from '../kubernetes/kubernetes.module';

@Module({
  imports: [PrismaModule, KubernetesModule],
  controllers: [PipelinesController],
  providers: [PipelinesService],
  exports: [PipelinesService],
})
export class PipelinesModule {}
