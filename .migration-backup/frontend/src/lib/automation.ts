import api from "./api";

export interface AutomationScript {
  id: string;
  name: string;
  description?: string;
  language: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  steps: Array<Record<string, unknown>>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  durationMs?: number;
}

export const automationApi = {
  // Scripts
  listScripts: async () => {
    const { data } = await api.get<{ scripts: AutomationScript[] }>("/automation/scripts");
    return data.scripts ?? [];
  },
  getScript: async (id: string) => {
    const { data } = await api.get<{ script: AutomationScript }>(`/automation/scripts/${id}`);
    return data.script;
  },
  createScript: async (payload: Partial<AutomationScript>) => {
    const { data } = await api.post<{ script: AutomationScript }>("/automation/scripts", payload);
    return data.script;
  },
  updateScript: async (id: string, payload: Partial<AutomationScript>) => {
    const { data } = await api.put<{ script: AutomationScript }>(`/automation/scripts/${id}`, payload);
    return data.script;
  },
  deleteScript: async (id: string) => {
    const { data } = await api.delete<{ success: boolean }>(`/automation/scripts/${id}`);
    return data;
  },
  executeScript: async (id: string, payload?: Record<string, unknown>) => {
    const { data } = await api.post<ExecutionResult>(`/automation/scripts/${id}/execute`, payload ?? {});
    return data;
  },

  // Workflows
  listWorkflows: async () => {
    const { data } = await api.get<{ workflows: AutomationWorkflow[] }>("/automation/workflows");
    return data.workflows ?? [];
  },
  getWorkflow: async (id: string) => {
    const { data } = await api.get<{ workflow: AutomationWorkflow }>(`/automation/workflows/${id}`);
    return data.workflow;
  },
  createWorkflow: async (payload: Partial<AutomationWorkflow>) => {
    const { data } = await api.post<{ workflow: AutomationWorkflow }>("/automation/workflows", payload);
    return data.workflow;
  },
  updateWorkflow: async (id: string, payload: Partial<AutomationWorkflow>) => {
    const { data } = await api.put<{ workflow: AutomationWorkflow }>(`/automation/workflows/${id}`, payload);
    return data.workflow;
  },
  deleteWorkflow: async (id: string) => {
    const { data } = await api.delete<{ success: boolean }>(`/automation/workflows/${id}`);
    return data;
  },
  executeWorkflow: async (id: string, payload?: Record<string, unknown>) => {
    const { data } = await api.post<ExecutionResult>(`/automation/workflows/${id}/execute`, payload ?? {});
    return data;
  },
};
