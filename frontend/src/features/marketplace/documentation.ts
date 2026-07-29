import api from "@/lib/api";

export interface DocCategory {
  id: string;
  name: string;
  description?: string;
}

export interface DocTag {
  id: string;
  name: string;
}

export interface Document {
  id: string;
  title: string;
  content?: string;
  categoryId?: string;
  tags?: string[];
  ownerId: string;
  fileUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocVersion {
  id: string;
  documentId: string;
  version: number;
  authorId: string;
  changeNote?: string;
  createdAt: string;
}

export interface DocCollaborator {
  userId: string;
  role: "viewer" | "editor" | "owner";
  addedAt: string;
}

export const documentationApi = {
  // Documents
  list: async (params?: { categoryId?: string; tag?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.categoryId) qs.set("categoryId", params.categoryId);
    if (params?.tag) qs.set("tag", params.tag);
    if (params?.q) qs.set("q", params.q);
    const { data } = await api.get<{ documents: Document[] }>(`/documentation/documents?${qs.toString()}`);
    return data.documents ?? [];
  },
  get: async (id: string) => {
    const { data } = await api.get<{ document: Document }>(`/documentation/documents/${id}`);
    return data.document;
  },
  create: async (payload: Partial<Document>) => {
    const { data } = await api.post<{ document: Document }>("/documentation/documents", payload);
    return data.document;
  },
  update: async (id: string, payload: Partial<Document>) => {
    const { data } = await api.put<{ document: Document }>(`/documentation/documents/${id}`, payload);
    return data.document;
  },
  remove: async (id: string) => {
    const { data } = await api.delete<{ success: boolean }>(`/documentation/documents/${id}`);
    return data;
  },
  upload: async (file: File, payload?: { title?: string; categoryId?: string }) => {
    const form = new FormData();
    form.append("file", file);
    if (payload?.title) form.append("title", payload.title);
    if (payload?.categoryId) form.append("categoryId", payload.categoryId);
    const { data } = await api.post<{ document: Document }>("/documentation/documents/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.document;
  },
  download: async (id: string) => {
    const res = await api.get<Blob>(`/documentation/documents/${id}/download`, { responseType: "blob" });
    return res.data;
  },
  exportDoc: async (id: string, payload: { format: "pdf" | "html" | "md" }) => {
    const { data } = await api.post<{ url: string }>(`/documentation/documents/${id}/export`, payload);
    return data;
  },

  // Versions
  listVersions: async (id: string) => {
    const { data } = await api.get<{ versions: DocVersion[] }>(`/documentation/documents/${id}/versions`);
    return data.versions ?? [];
  },
  getVersion: async (id: string, versionId: string) => {
    const { data } = await api.get<{ version: DocVersion }>(`/documentation/documents/${id}/versions/${versionId}`);
    return data.version;
  },
  restoreVersion: async (id: string, versionId: string) => {
    const { data } = await api.post<{ document: Document }>(`/documentation/documents/${id}/restore/${versionId}`, {});
    return data.document;
  },

  // Collaborators
  listCollaborators: async (id: string) => {
    const { data } = await api.get<{ collaborators: DocCollaborator[] }>(`/documentation/documents/${id}/collaborators`);
    return data.collaborators ?? [];
  },
  addCollaborator: async (id: string, payload: { userId: string; role: DocCollaborator["role"] }) => {
    const { data } = await api.post<{ collaborator: DocCollaborator }>(`/documentation/documents/${id}/collaborators`, payload);
    return data.collaborator;
  },
  removeCollaborator: async (id: string, userId: string) => {
    const { data } = await api.delete<{ success: boolean }>(`/documentation/documents/${id}/collaborators/${userId}`);
    return data;
  },

  // Taxonomy
  listCategories: async () => {
    const { data } = await api.get<{ categories: DocCategory[] }>("/documentation/categories");
    return data.categories ?? [];
  },
  createCategory: async (payload: { name: string; description?: string }) => {
    const { data } = await api.post<{ category: DocCategory }>("/documentation/categories", payload);
    return data.category;
  },
  listTags: async () => {
    const { data } = await api.get<{ tags: DocTag[] }>("/documentation/tags");
    return data.tags ?? [];
  },

  // Search
  search: async (payload: { q: string; categoryId?: string; tag?: string }) => {
    const { data } = await api.post<{ results: Document[] }>("/documentation/search", payload);
    return data.results ?? [];
  },
};
