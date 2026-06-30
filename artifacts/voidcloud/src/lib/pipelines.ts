import api from './api';

export interface DeploymentHistory {
  id: string;
  provider: string;
  owner?: string;
  repo: string;
  workflowId?: string;
  ref?: string;
  status: string;
  initiatedBy?: string;
  startedAt?: string;
  finishedAt?: string;
  details?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion?: string;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_commit: {
    id: string;
    message: string;
    author: {
      name: string;
    };
  };
}

export interface TriggerPipelineRequest {
  provider: string;
  owner?: string;
  repo: string;
  workflowId?: string;
  ref?: string;
  inputs?: Record<string, unknown>;
  initiatedBy?: string;
}

export interface CreateCustomPipelineRequest {
  name: string;
  provider: string;
  owner?: string;
  repo: string;
  workflowId: string;
  ref?: string;
  description?: string;
  enabled?: boolean;
}

export const pipelinesApi = {
  // Trigger pipeline
  triggerPipeline: (data: TriggerPipelineRequest) =>
    api.post<{ success: boolean; deployment: DeploymentHistory }>('/pipelines/trigger', data),

  // Deployment history
  getDeploymentHistory: (limit?: number) => 
    api.get<{ count: number; items: DeploymentHistory[] }>(`/pipelines/history${limit ? `?limit=${limit}` : ''}`),
  
  getDeploymentById: (id: string) => 
    api.get<{ item: DeploymentHistory }>(`/pipelines/history/${id}`),
  
  updateDeploymentStatus: (id: string, data: { status: string; details?: Record<string, unknown> }) =>
    api.put<{ success: boolean; updated: DeploymentHistory }>(`/pipelines/history/${id}/status`, data),

  // Rollback
  rollbackDeployment: (id: string) =>
    api.post<{ success: boolean; deployment: DeploymentHistory }>(`/pipelines/rollback/${id}`, {}),

  // Custom pipelines
  createCustomPipeline: (data: CreateCustomPipelineRequest) =>
    api.post<{ success: boolean; pipeline: DeploymentHistory }>('/pipelines/custom', data),

  // GitHub workflows
  getRecentWorkflows: (owner: string, repo: string, limit?: number) =>
    api.get<{ count: number; workflows: WorkflowRun[] }>(`/pipelines/workflows/${owner}/${repo}${limit ? `?limit=${limit}` : ''}`),
  
  getWorkflowStatus: (owner: string, repo: string, runId: string) =>
    api.get<{ workflow: WorkflowRun }>(`/pipelines/workflows/${owner}/${repo}/${runId}`),
};
