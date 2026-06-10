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
    const { data } = await api.post(`/learning/paths/${pathId}/enroll`, { userId });
    return data;
  },
  getPathProgress: async (pathId: string, userId: string) => {
    const { data } = await api.get(`/learning/paths/${pathId}/progress/${userId}`);
    return data;
  },
  getPaths: async () => {
    const { data } = await api.get<{ paths: Array<Record<string, unknown>> }>("/learning/paths");
    return data.paths ?? [];
  },
  getPath: async (id: string) => {
    const { data } = await api.get(`/learning/paths/${id}`);
    return data;
  },
  saveJob: async (payload: { jobId: string; userId: string }) => {
    const { data } = await api.post("/learning/jobs/saved", payload);
    return data;
  },
  getSavedJobs: async (userId: string) => {
    const { data } = await api.get<{ jobs: DevOpsJob[] }>(`/learning/jobs/saved/${userId}`);
    return data.jobs ?? [];
  },
  deleteSavedJob: async (id: string) => {
    const { data } = await api.delete<{ success: boolean }>(`/learning/jobs/saved/${id}`);
    return data;
  },

  // Books
  getBooks: async () => {
    const { data } = await api.get<{ books: Array<Record<string, unknown>> }>("/learning/books");
    return data.books ?? [];
  },
  getBookTracker: async (userId: string) => {
    const { data } = await api.get<{ items: Array<Record<string, unknown>> }>(`/learning/books/tracker/${userId}`);
    return data.items ?? [];
  },
  trackBook: async (payload: { bookId: string; userId: string; status: string; progress?: number }) => {
    const { data } = await api.post("/learning/books/tracker", payload);
    return data;
  },

  // Certifications
  getCertifications: async () => {
    const { data } = await api.get<{ certifications: Array<Record<string, unknown>> }>("/learning/certifications");
    return data.certifications ?? [];
  },
  getCertTracker: async (userId: string) => {
    const { data } = await api.get<{ items: Array<Record<string, unknown>> }>(`/learning/certifications/tracker/${userId}`);
    return data.items ?? [];
  },
  trackCert: async (payload: { certId: string; userId: string; status: string; examDate?: string }) => {
    const { data } = await api.post("/learning/certifications/tracker", payload);
    return data;
  },
  updateCertTracker: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/learning/certifications/tracker/${id}`, payload);
    return data;
  },

  // Conferences
  getConferences: async () => {
    const { data } = await api.get<{ conferences: Array<Record<string, unknown>> }>("/learning/conferences");
    return data.conferences ?? [];
  },
  registerConference: async (id: string, payload: { userId: string }) => {
    const { data } = await api.post(`/learning/conferences/${id}/register`, payload);
    return data;
  },

  // News & blog
  getNews: async () => {
    const { data } = await api.get<{ articles: Array<Record<string, unknown>> }>("/learning/news");
    return data.articles ?? [];
  },
  getBlogPosts: async () => {
    const { data } = await api.get<{ posts: Array<Record<string, unknown>> }>("/learning/blog");
    return data.posts ?? [];
  },
  createBlogPost: async (payload: { title: string; content: string; authorId: string; tags?: string[] }) => {
    const { data } = await api.post("/learning/blog", payload);
    return data;
  },
  deleteBlogPost: async (id: string) => {
    const { data } = await api.delete<{ success: boolean }>(`/learning/blog/${id}`);
    return data;
  },

  // CV
  getCvTemplates: async () => {
    const { data } = await api.get<{ templates: Array<Record<string, unknown>> }>("/learning/cv/templates");
    return data.templates ?? [];
  },
  listCvs: async () => {
    const { data } = await api.get<{ cvs: Array<Record<string, unknown>> }>("/learning/cv");
    return data.cvs ?? [];
  },
  getCv: async (id: string) => {
    const { data } = await api.get(`/learning/cv/${id}`);
    return data;
  },
  createCv: async (payload: Record<string, unknown>) => {
    const { data } = await api.post("/learning/cv", payload);
    return data;
  },
  updateCv: async (id: string, payload: Record<string, unknown>) => {
    const { data } = await api.put(`/learning/cv/${id}`, payload);
    return data;
  },
  deleteCv: async (id: string) => {
    const { data } = await api.delete<{ success: boolean }>(`/learning/cv/${id}`);
    return data;
  },
  compileCv: async (id: string) => {
    const { data } = await api.post(`/learning/cv/${id}/compile`, {});
    return data;
  },
  exportCv: async (id: string, payload: { format: "pdf" | "docx" | "html" }) => {
    const { data } = await api.post(`/learning/cv/${id}/export`, payload);
    return data;
  },
  optimizeCv: async (id: string, payload?: { jobDescription?: string }) => {
    const { data } = await api.post(`/learning/cv/${id}/optimize`, payload ?? {});
    return data;
  },
  atsScore: async (id: string, payload?: { jobDescription?: string }) => {
    const { data } = await api.post<{ score: number; suggestions: string[] }>(
      `/learning/cv/${id}/ats-score`,
      payload ?? {},
    );
    return data;
  },
  importGithubToCv: async (id: string, payload: { username: string }) => {
    const { data } = await api.post(`/learning/cv/${id}/github-import`, payload);
    return data;
  },
};
