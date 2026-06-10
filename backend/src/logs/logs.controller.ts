import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    Logger,
    Sse,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogsService } from './logs.service';
import { Observable, interval, switchMap } from 'rxjs';

@ApiTags('Logs')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
    private readonly logger = new Logger(LogsController.name);

    constructor(private logsService: LogsService) { }

    /**
     * GET /logs/pods/:namespace/:podName
     * Get logs from a specific pod
     */
    @Get('pods/:namespace/:podName')
    @ApiOperation({ summary: 'Get pod logs' })
    async getPodLogs(
        @Param('namespace') namespace: string,
        @Param('podName') podName: string,
        @Query('previous') previous?: string | boolean,
        @Query('tailLines') tailLines?: string,
        @Query('timestamps') timestamps?: string | boolean,
        @Query('sinceSeconds') sinceSeconds?: string
    ) {
        const logs = await this.logsService.getPodLogs(namespace, podName, {
            previous: previous === true || previous === 'true',
            tailLines: tailLines ? parseInt(tailLines) : 100,
            timestamps: timestamps === true || timestamps === 'true',
            sinceSeconds: sinceSeconds ? parseInt(sinceSeconds) : undefined,
        });

        return {
            podName,
            namespace,
            logs,
        };
    }

    /**
     * GET /logs/pods/:namespace/:podName/containers
     * Get list of containers in a pod
     */
    @Get('pods/:namespace/:podName/containers')
    @ApiOperation({ summary: 'Get pod containers' })
    async getPodContainers(
        @Param('namespace') namespace: string,
        @Param('podName') podName: string
    ) {
        const containers = await this.logsService.getPodContainers(namespace, podName);
        return {
            podName,
            namespace,
            containers,
        };
    }

    /**
     * GET /logs/pods/:namespace/:podName/containers/:containerName
     * Get logs from specific container
     */
    @Get('pods/:namespace/:podName/containers/:containerName')
    @ApiOperation({ summary: 'Get container logs' })
    async getContainerLogs(
        @Param('namespace') namespace: string,
        @Param('podName') podName: string,
        @Param('containerName') containerName: string,
        @Query('tailLines') tailLines?: string,
        @Query('timestamps') timestamps?: string | boolean
    ) {
        const logs = await this.logsService.getContainerLogs(
            namespace,
            podName,
            containerName,
            {
                tailLines: tailLines ? parseInt(tailLines) : 100,
                timestamps: timestamps === true || timestamps === 'true',
            }
        );

        return {
            podName,
            namespace,
            containerName,
            logs,
        };
    }

    /**
     * GET /logs/pods/:namespace/:podName/crash
     * Get crash logs from pod (previous logs if pod restarted)
     */
    @Get('pods/:namespace/:podName/crash')
    @ApiOperation({ summary: 'Get pod crash logs' })
    async getPodCrashLogs(
        @Param('namespace') namespace: string,
        @Param('podName') podName: string
    ) {
        const logs = await this.logsService.getPodCrashLogs(namespace, podName);
        return {
            podName,
            namespace,
            crashLogs: logs,
            available: logs !== null,
        };
    }

    /**
     * GET /logs/deployments/:namespace/:deploymentName
     * Get logs from all pods in a deployment (multi-pod tail)
     */
    @Get('deployments/:namespace/:deploymentName')
    @ApiOperation({ summary: 'Get deployment logs (all pods)' })
    async getDeploymentLogs(
        @Param('namespace') namespace: string,
        @Param('deploymentName') deploymentName: string,
        @Query('tailLines') tailLines?: string,
        @Query('timestamps') timestamps?: string | boolean
    ) {
        const logsMap = await this.logsService.getDeploymentLogs(
            namespace,
            deploymentName,
            {
                tailLines: tailLines ? parseInt(tailLines) : 100,
                timestamps: timestamps === true || timestamps === 'true',
            }
        );

        const logsObject: Record<string, string> = {};
        logsMap.forEach((logs, podName) => {
            logsObject[podName] = logs;
        });

        return {
            deploymentName,
            namespace,
            pods: logsObject,
        };
    }

    /**
     * GET /logs/search
     * Search logs for a pattern
     */
    @Get('search')
    @ApiOperation({ summary: 'Search logs for pattern' })
    async searchLogs(
        @Query('logs') logs: string,
        @Query('pattern') pattern: string,
        @Query('caseSensitive') caseSensitive?: string | boolean
    ) {
        const results = await this.logsService.searchLogs(
            logs,
            pattern,
            caseSensitive === true || caseSensitive === 'true'
        );

        return {
            pattern,
            caseSensitive: caseSensitive === true || caseSensitive === 'true',
            matches: results.length,
            results,
        };
    }

    /**
     * GET /logs/failed?namespace=default
     * Get logs from failed pods
     */
    @Get('failed')
    @ApiOperation({ summary: 'Get failed pod logs' })
    async getFailedPodLogs(@Query('namespace') namespace?: string) {
        const failedPods = await this.logsService.getFailedPodLogs(namespace);
        return {
            count: failedPods.length,
            failed: failedPods,
        };
    }

    /**
     * GET /logs/stream/:namespace/:podName
     * Server-sent events log tail stream
     */
    @Sse('stream/:namespace/:podName')
    @ApiOperation({ summary: 'Stream pod logs (SSE)' })
    streamPodLogs(
        @Param('namespace') namespace: string,
        @Param('podName') podName: string,
        @Query('tailLines') tailLines?: string,
    ): Observable<MessageEvent> {
        const lines = tailLines ? parseInt(tailLines) : 100;
        return interval(2000).pipe(
            switchMap(async () => {
                const logs = await this.logsService.getPodLogs(namespace, podName, {
                    tailLines: lines,
                    timestamps: true,
                });
                return {
                    data: {
                        namespace,
                        podName,
                        logs,
                        timestamp: new Date().toISOString(),
                    },
                } as MessageEvent;
            }),
        );
    }
}
