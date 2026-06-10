import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KubernetesService } from '../kubernetes/kubernetes.service';

@Injectable()
export class PipelinesService {
    private readonly logger = new Logger(PipelinesService.name);

    constructor(
        private prisma: PrismaService,
        private kubernetesService: KubernetesService
    ) { }

    /**
     * Trigger a pipeline. Supports GitHub Actions via workflow_dispatch when GITHUB_TOKEN is present.
     * Records a DeploymentHistory entry and returns it.
     */
    async triggerPipeline(options: {
        provider: 'github' | 'gitlab' | string;
        owner?: string;
        repo: string;
        workflowId?: string; // for GitHub: workflow file name or id
        ref?: string;
        inputs?: Record<string, any>;
        initiatedBy?: string;
    }) {
        const { provider, owner, repo, workflowId, ref, inputs, initiatedBy } = options;

        // Create DB record (PENDING)
        const record = await this.prisma.deploymentHistory.create({
            data: {
                provider,
                owner,
                repo,
                workflowId,
                ref,
                status: 'PENDING',
                initiatedBy,
            },
        });

        try {
            if (provider === 'github') {
                await this.triggerGitHubWorkflow(owner, repo, workflowId, ref, inputs);
            } else {
                // For other providers, implementation can be added later
                this.logger.warn(`Trigger for provider ${provider} not implemented`);
            }

            // Update record to TRIGGERED
            const updated = await this.prisma.deploymentHistory.update({
                where: { id: record.id },
                data: { status: 'TRIGGERED', startedAt: new Date() },
            });

            return updated;
        } catch (error) {
            this.logger.error(`Failed to trigger pipeline: ${error.message}`);
            await this.prisma.deploymentHistory.update({
                where: { id: record.id },
                data: { status: 'FAILED', finishedAt: new Date(), details: { error: error.message } },
            });
            throw error;
        }
    }

    private async triggerGitHubWorkflow(
        owner: string,
        repo: string,
        workflowId: string,
        ref = 'main',
        inputs?: Record<string, any>
    ) {
        const token = process.env.GITHUB_TOKEN;
        if (!token) throw new Error('GITHUB_TOKEN not configured');

        const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

        const body: any = { ref };
        if (inputs) body.inputs = inputs;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'amer-portal',
            },
            body: JSON.stringify(body),
        });

        if (res.status !== 204) {
            const text = await res.text();
            throw new Error(`GitHub dispatch failed: ${res.status} ${text}`);
        }

        return true;
    }

    async listDeploymentHistory(limit = 50) {
        return this.prisma.deploymentHistory.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    async getDeploymentById(id: string) {
        return this.prisma.deploymentHistory.findUnique({ where: { id } });
    }

    async updateDeploymentStatus(id: string, status: string, details?: any) {
        return this.prisma.deploymentHistory.update({
            where: { id },
            data: { status, details, updatedAt: new Date(), finishedAt: status === 'SUCCESS' || status === 'FAILED' ? new Date() : undefined },
        });
    }

    /**
     * Rollback to a previous deployment
     */
    async rollbackDeployment(deploymentId: string) {
        try {
            const deployment = await this.prisma.deploymentHistory.findUnique({
                where: { id: deploymentId },
            });

            if (!deployment) {
                throw new Error('Deployment not found');
            }

            // Trigger a new deployment with the same parameters
            const rollbackRecord = await this.triggerPipeline({
                provider: deployment.provider,
                owner: deployment.owner,
                repo: deployment.repo,
                workflowId: deployment.workflowId,
                ref: deployment.ref,
                initiatedBy: `rollback-${deploymentId}`,
            });

            // Update the original deployment to mark it as rolled back
            await this.prisma.deploymentHistory.update({
                where: { id: deploymentId },
                data: {
                    details: {
                        ...(typeof deployment.details === 'object' ? deployment.details : {}),
                        rolledBackTo: rollbackRecord.id,
                        rolledBackAt: new Date(),
                    },
                },
            });

            this.logger.log(`Rolled back deployment ${deploymentId} to ${rollbackRecord.id}`);
            return rollbackRecord;
        } catch (error) {
            this.logger.error(`Failed to rollback deployment: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create a custom deployment pipeline
     */
    async createCustomPipeline(options: {
        name: string;
        provider: 'github' | 'gitlab';
        owner?: string;
        repo: string;
        workflowId: string;
        ref?: string;
        description?: string;
        enabled?: boolean;
    }) {
        try {
            const pipeline = await this.prisma.deploymentHistory.create({
                data: {
                    provider: options.provider,
                    owner: options.owner,
                    repo: options.repo,
                    workflowId: options.workflowId,
                    ref: options.ref || 'main',
                    status: 'CUSTOM',
                    details: {
                        name: options.name,
                        description: options.description,
                        enabled: options.enabled ?? true,
                    },
                },
            });

            this.logger.log(`Created custom pipeline: ${options.name}`);
            return pipeline;
        } catch (error) {
            this.logger.error(`Failed to create custom pipeline: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get workflow status from GitHub
     */
    async getWorkflowStatus(owner: string, repo: string, runId: string) {
        try {
            const token = process.env.GITHUB_TOKEN;
            if (!token) throw new Error('GITHUB_TOKEN not configured');

            const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`;

            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'amer-portal',
                },
            });

            if (!res.ok) {
                throw new Error(`GitHub API failed: ${res.status}`);
            }

            const data = await res.json();
            return {
                id: data.id,
                status: data.status,
                conclusion: data.conclusion,
                created_at: data.created_at,
                updated_at: data.updated_at,
                head_branch: data.head_branch,
                head_commit: data.head_commit,
            };
        } catch (error) {
            this.logger.error(`Failed to get workflow status: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get recent workflow runs
     */
    async getRecentWorkflows(owner: string, repo: string, limit: number = 10) {
        try {
            const token = process.env.GITHUB_TOKEN;
            if (!token) throw new Error('GITHUB_TOKEN not configured');

            const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=${limit}`;

            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'amer-portal',
                },
            });

            if (!res.ok) {
                throw new Error(`GitHub API failed: ${res.status}`);
            }

            const data = await res.json();
            return data.workflow_runs.map((run: any) => ({
                id: run.id,
                name: run.name,
                status: run.status,
                conclusion: run.conclusion,
                created_at: run.created_at,
                updated_at: run.updated_at,
                head_branch: run.head_branch,
                head_commit: run.head_commit,
            }));
        } catch (error) {
            this.logger.error(`Failed to get recent workflows: ${error.message}`);
            throw error;
        }
    }
}
