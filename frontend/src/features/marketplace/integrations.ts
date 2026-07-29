import api from "@/lib/api";

export interface IntegrationWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt?: string;
}

export const integrationsApi = {
  getWebhooks: async () => {
    const { data } = await api.get<{ webhooks: IntegrationWebhook[] }>("/integrations/webhooks");
    return data.webhooks ?? [];
  },
  createWebhook: async (payload: { name: string; url: string; events?: string[] }) => {
    const { data } = await api.post<{ webhook: IntegrationWebhook }>("/integrations/webhooks", {
      events: ["deployment", "alert"],
      ...payload,
    });
    return data.webhook;
  },
  updateSlackConfig: async (payload: { webhookUrl?: string; channel?: string; enabled?: boolean }) => {
    const { data } = await api.put("/integrations/slack/config", payload);
    return data;
  },
};
