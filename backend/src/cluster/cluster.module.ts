import { Module } from '@nestjs/common';
import { ClusterController } from './cluster.controller';
import { ClusterService } from './cluster.service';
import { KubernetesModule } from '../kubernetes/kubernetes.module';

@Module({
  imports: [KubernetesModule],
  controllers: [ClusterController],
  providers: [ClusterService],
  exports: [ClusterService],
})
export class ClusterModule {}
