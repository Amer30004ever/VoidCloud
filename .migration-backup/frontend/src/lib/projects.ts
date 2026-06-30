import api from "./api";

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  repository?: string | null;
  namespace?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const projectsApi = {
  list: async () => {
    const { data } = await api.get<{ projects: Project[] }>("/projects");
    return data.projects;
  },
  create: async (payload: { name: string; description?: string; repository?: string; namespace?: string }) => {
    const { data } = await api.post<{ success: boolean; project: Project }>("/projects", payload);
    return data.project;
  },
  remove: async (id: string) => {
    await api.delete(`/projects/${id}`);
  },
};
