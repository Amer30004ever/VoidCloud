import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Stats')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all stats' })
  @ApiOkResponse({
    description: 'Returns all cluster statistics',
    schema: {
      example: {
        activePipelines: 5,
        deploymentsToday: 12,
        runningPods: 45,
        activeAlerts: 3,
        runningNamespaces: 8,
      },
    },
  })
  async getAllStats() {
    return this.statsService.getStats();
  }

  @Public()
  @Get('pipelines')
  @ApiOperation({ summary: 'Get active pipelines count' })
  @ApiOkResponse({
    description: 'Returns count of active CI/CD pipelines',
    schema: { example: { count: 5 } },
  })
  async getPipelines() {
    return this.statsService.getPipelines();
  }

  @Public()
  @Get('deployments')
  @ApiOperation({ summary: 'Get deployments today count' })
  @ApiOkResponse({
    description: 'Returns count of deployments created today',
    schema: { example: { count: 12 } },
  })
  async getDeployments() {
    return this.statsService.getDeployments();
  }

  @Public()
  @Get('pods')
  @ApiOperation({ summary: 'Get running pods count' })
  @ApiOkResponse({
    description: 'Returns count of running pods',
    schema: { example: { count: 45 } },
  })
  async getPods() {
    return this.statsService.getPods();
  }

  @Public()
  @Get('alerts')
  @ApiOperation({ summary: 'Get active alerts count' })
  @ApiOkResponse({
    description: 'Returns count of active alerts',
    schema: { example: { count: 3 } },
  })
  async getAlerts() {
    return this.statsService.getAlerts();
  }

  @Public()
  @Get('namespaces')
  @ApiOperation({
    summary: 'Get running namespaces count (excluding kube-system)',
  })
  @ApiOkResponse({
    description: 'Returns count of running namespaces excluding kube-system',
    schema: { example: { count: 8 } },
  })
  async getNamespaces() {
    return this.statsService.getNamespaces();
  }

  @Public()
  @Get('cluster-health')
  @ApiOperation({ summary: 'Get cluster health metrics (CPU, Memory, Disk)' })
  @ApiOkResponse({
    description: 'Returns cluster health metrics',
    schema: {
      example: {
        cpu: { usage: 2.5, capacity: 8, usagePercent: 31.25 },
        memory: { usage: 8589934592, capacity: 17179869184, usagePercent: 50 },
        disk: { usage: 53687091200, capacity: 107374182400, usagePercent: 50 },
        nodes: 3,
        pods: 45,
      },
    },
  })
  async getClusterHealth() {
    return this.statsService.getClusterHealth();
  }

  @Public()
  @Get('recent-deployments')
  @ApiOperation({ summary: 'Get recent deployments with timestamps' })
  @ApiOkResponse({
    description: 'Returns recent deployments',
    schema: {
      example: {
        deployments: [
          {
            name: 'app-backend',
            namespace: 'default',
            replicas: 3,
            readyReplicas: 3,
            image: 'nginx:latest',
            createdAt: '2024-01-15T10:30:00Z',
          },
        ],
      },
    },
  })
  async getRecentDeployments(@Query('limit') limit?: string) {
    return this.statsService.getRecentDeployments(limit ? parseInt(limit) : 5);
  }

  @Public()
  @Get('failed-pods')
  @ApiOperation({ summary: 'Get failed pods' })
  @ApiOkResponse({
    description: 'Returns failed pods',
    schema: {
      example: {
        failedPods: [
          {
            name: 'pod-1',
            namespace: 'default',
            phase: 'CrashLoopBackOff',
            restartCount: 5,
            reason: 'Error',
            message: 'Container exited with error',
            createdAt: '2024-01-15T10:30:00Z',
          },
        ],
      },
    },
  })
  async getFailedPods() {
    return this.statsService.getFailedPods();
  }

  @Public()
  @Get('service-status')
  @ApiOperation({
    summary: 'Get service status (Harbor, Jaeger, Traefik, etc.)',
  })
  @ApiOkResponse({
    description: 'Returns service status with health, uptime, and last issue',
    schema: {
      example: {
        services: [
          {
            name: 'Harbor',
            status: 'Online',
            uptime: '2d 2h',
            lastIssue: 'None',
          },
          {
            name: 'Jaeger',
            status: 'Online',
            uptime: '7d 16h',
            lastIssue: 'None',
          },
          {
            name: 'Traefik',
            status: 'Down',
            uptime: '2d',
            lastIssue: 'CrashLoop',
          },
        ],
      },
    },
  })
  async getServiceStatus() {
    return this.statsService.getServiceStatus();
  }

  @Public()
  @Get('pod-status')
  @ApiOperation({ summary: 'Get pod status list' })
  @ApiOkResponse({
    description: 'Returns pod status with namespace, status, restarts, and age',
  })
  async getPodStatusList() {
    const pods = await this.statsService.getPodsList();
    return { pods };
  }

  @Public()
  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent activity feed' })
  @ApiOkResponse({
    description: 'Returns recent activity events',
  })
  async getRecentActivityList() {
    const activity = await this.statsService.getRecentActivityList();
    return { activities: activity };
  }
}
