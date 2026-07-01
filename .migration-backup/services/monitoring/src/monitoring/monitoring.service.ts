import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  clusterNodes() {
    return {
      nodes: [
        { name: 'masternode01', role: 'control-plane', cpu: 4, memoryGB: 4 },
        { name: 'workernode01', role: 'worker', cpu: 8, memoryGB: 24 },
      ],
    };
  }

  clusterPods() {
    return { pods: [], note: 'Connect in-cluster K8s API for live pod metrics' };
  }

  namespaces() {
    return { namespaces: ['voidcloud', 'kube-system', 'traefik'] };
  }

  metrics() {
    return { uptime: process.uptime(), timestamp: new Date().toISOString() };
  }

  alerts() {
    return this.prisma.alert.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
  }

  createAlert(data: Record<string, unknown>) {
    return this.prisma.alert.create({ data: data as never });
  }
}
