import api from "./api";

export interface DevOpsJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  skills: string[];
  postedAt: string;
  url: string;
  source?: string;
}

export const learningApi = {
  getJobs: async (keyword?: string, location?: string) => {
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (location) params.set("location", location);
    const { data } = await api.get<{ jobs: DevOpsJob[] }>(`/learning/jobs?${params.toString()}`);
    return data.jobs;
  },
  enrollPath: async (pathId: string, userId: string) => {
    const { data } = await api.post("/learning/paths/enroll", { pathId, userId });
    return data;
  },
  getPathProgress: async (userId: string) => {
    const { data } = await api.get(`/learning/paths/progress/${userId}`);
    return data;
  },
};
