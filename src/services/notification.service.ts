import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { NotificationItem, NotificationQuery } from '../types/notification';

export const notificationService = {
  async getNotifications(query?: NotificationQuery): Promise<NotificationItem[]> {
    const response = await api.get('/notifications/', {
      params: query,
    });
    const data = unwrapData<any>(response.data);
    
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.data)) return data.data;
    
    return [];
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.post(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },
};
