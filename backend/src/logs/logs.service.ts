import { Injectable, Logger } from '@nestjs/common';
import { KubernetesService } from '../kubernetes/kubernetes.service';

@Injectable()
export class LogsService {
    private readonly logger = new Logger(LogsService.name);

    constructor(private kubernetesService: KubernetesService) { }

    /**
     * Get logs from a pod
     */
    async getPodLogs(
        namespace: string,
        podName: string,
        options: {
            previous?: boolean;
            follow?: boolean;
            tailLines?: number;
            timestamps?: boolean;
            sinceSeconds?: number;
        } = {}
    ): Promise<string> {
        try {
            const logs = await this.kubernetesService.getPodLogs(
                namespace,
                podName,
                options
            );
            return logs;
        } catch (error) {
            this.logger.error(`Error fetching pod logs: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get logs from all pods in a deployment
     */
    async getDeploymentLogs(
        namespace: string,
        deploymentName: string,
        options: { tailLines?: number; timestamps?: boolean } = {}
    ): Promise<Map<string, string>> {
        try {
            // Get all pods for this deployment
            const pods = await this.kubernetesService.getPods(namespace);
            const deploymentPods = pods.filter(
                pod => pod.metadata?.labels?.['app'] === deploymentName
            );

            if (deploymentPods.length === 0) {
                this.logger.warn(`No pods found for deployment ${deploymentName}`);
                return new Map();
            }

            // Fetch logs for each pod
            const logsMap = new Map<string, string>();

            for (const pod of deploymentPods) {
                try {
                    const podName = pod.metadata?.name;
                    const logs = await this.getPodLogs(namespace, podName, options);
                    logsMap.set(podName, logs);
                } catch (error) {
                    this.logger.warn(`Failed to get logs for pod: ${error.message}`);
                }
            }

            return logsMap;
        } catch (error) {
            this.logger.error(`Error fetching deployment logs: ${error.message}`);
            throw error;
        }
    }

    /**
     * Search logs for a pattern
     */
    async searchLogs(
        logs: string,
        pattern: string,
        caseSensitive: boolean = false
    ): Promise<string[]> {
        try {
            const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
            const lines = logs.split('\n');
            return lines.filter(line => regex.test(line));
        } catch (error) {
            this.logger.error(`Error searching logs: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get pod crash logs (previous logs if pod restarted)
     */
    async getPodCrashLogs(
        namespace: string,
        podName: string
    ): Promise<string | null> {
        try {
            const logs = await this.kubernetesService.getPodLogs(namespace, podName, {
                previous: true,
            });
            return logs || null;
        } catch (error) {
            this.logger.warn(
                `No previous logs available for pod ${podName}: ${error.message}`
            );
            return null;
        }
    }

    /**
     * Get pod container list for multi-container pods
     */
    async getPodContainers(namespace: string, podName: string): Promise<string[]> {
        try {
            const pod = await this.kubernetesService.getPodDetails(namespace, podName);
            return (
                pod.spec?.containers?.map((container: any) => container.name) || []
            );
        } catch (error) {
            this.logger.error(`Error fetching pod containers: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get logs from specific container in a pod
     */
    async getContainerLogs(
        namespace: string,
        podName: string,
        containerName: string,
        options: { tailLines?: number; timestamps?: boolean } = {}
    ): Promise<string> {
        try {
            const logs = await this.kubernetesService.getPodLogs(
                namespace,
                podName,
                {
                    ...options,
                    container: containerName,
                }
            );
            return logs;
        } catch (error) {
            this.logger.error(`Error fetching container logs: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get failed pod logs with status info
     */
    async getFailedPodLogs(namespace?: string): Promise<any[]> {
        try {
            const pods = await this.kubernetesService.getPods(namespace);
            const failedPods = pods.filter(pod => {
                const phase = pod.status?.phase;
                return phase === 'Failed' || phase === 'CrashLoopBackOff';
            });

            const result = [];
            for (const pod of failedPods) {
                const podName = pod.metadata?.name;
                const podNamespace = pod.metadata?.namespace;
                try {
                    const logs = await this.getPodLogs(podNamespace, podName, {
                        tailLines: 50,
                    });
                    result.push({
                        name: podName,
                        namespace: podNamespace,
                        phase: pod.status?.phase,
                        restartCount:
                            pod.status?.containerStatuses?.[0]?.restartCount || 0,
                        lastState: pod.status?.containerStatuses?.[0]?.lastState,
                        logs: logs,
                    });
                } catch (error) {
                    result.push({
                        name: podName,
                        namespace: podNamespace,
                        phase: pod.status?.phase,
                        error: error.message,
                    });
                }
            }

            return result;
        } catch (error) {
            this.logger.error(`Error fetching failed pod logs: ${error.message}`);
            throw error;
        }
    }
}
