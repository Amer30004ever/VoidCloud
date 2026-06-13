import { Module } from '@nestjs/common';
import { AdminClusterController } from './admin-cluster.controller';
import { KubernetesModule } from '../kubernetes/kubernetes.module';
import { ClusterModule } from '../cluster/cluster.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [KubernetesModule, ClusterModule, DashboardModule],
  controllers: [AdminClusterController],
})
export class AdminClusterModule {}
