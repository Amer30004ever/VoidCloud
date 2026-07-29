import api from "@/lib/api";

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  content: string;
  userId?: string;
  userName?: string;
  createdAt: string;
}

export const collaborationApi = {
  getChannels: async () => {
    const { data } = await api.get<{ channels: ChatChannel[] }>("/collaboration/channels");
    return data.channels ?? [];
  },
  createChannel: async (payload: { name: string; description?: string }) => {
    const { data } = await api.post<{ channel: ChatChannel }>("/collaboration/channels", payload);
    return data.channel;
  },
  getMessages: async (channelId: string, limit = 50) => {
    const { data } = await api.get<{ messages: ChatMessage[] }>(
      `/collaboration/messages?channelId=${encodeURIComponent(channelId)}&limit=${limit}`,
    );
    return data.messages ?? [];
  },
  sendMessage: async (payload: { channelId: string; content: string; userId?: string }) => {
    const { data } = await api.post<{ message: ChatMessage }>("/collaboration/messages", payload);
    return data.message;
  },
  createKnowledgeArticle: async (payload: { title: string; content: string; category?: string }) => {
    const { data } = await api.post("/collaboration/knowledge", payload);
    return data;
  },
  createReview: async (payload: { title: string; repository: string; description?: string }) => {
    const { data } = await api.post("/collaboration/reviews", payload);
    return data;
  },
  createCalendarEvent: async (payload: { title: string; startTime: string; endTime?: string }) => {
    const { data } = await api.post("/collaboration/calendar", payload);
    return data;
  },
};
