import api from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';

export interface NotificationDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export const notificationsApi = {
  list: () => api.get<NotificationDto[]>('/notifications').then((r) => r.data),
  unreadOnly: () => api.get<NotificationDto[]>('/notifications', { params: { unreadOnly: 'true' } }).then((r) => r.data),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  remove: (id: string) => api.delete(`/notifications/${id}`),
  create: (data: { userId: string; title: string; message: string; type?: string; category?: string; link?: string }) =>
    api.post<NotificationDto>('/notifications', data),
};
