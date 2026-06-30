import api from "./api";

export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notesApi = {
  list: async (q?: string): Promise<Note[]> => {
    const { data } = await api.get<Note[]>("/notes", { params: { q } });
    return data;
  },
  get: async (id: string): Promise<Note> => {
    const { data } = await api.get<Note>(`/notes/${id}`);
    return data;
  },
  create: async (input: Partial<Note>): Promise<Note> => {
    const { data } = await api.post<Note>("/notes", input);
    return data;
  },
  update: async (id: string, input: Partial<Note>): Promise<Note> => {
    const { data } = await api.put<Note>(`/notes/${id}`, input);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/notes/${id}`);
  },
};
