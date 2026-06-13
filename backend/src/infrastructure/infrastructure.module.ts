import { Module } from '@nestjs/common';
import { InfrastructureService } from './infrastructure.service';
import { InfrastructureController } from './infrastructure.controller';
import { KubernetesModule } from '../kubernetes/kubernetes.module';

@Module({
  imports: [KubernetesModule],
  providers: [InfrastructureService],
  controllers: [InfrastructureController],
  exports: [InfrastructureService],
})
export class InfrastructureModule {}
