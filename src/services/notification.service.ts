import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { NotificationItem, NotificationQuery } from '../types/notification';

export const notificationService = {
  async getNotifications(query?: NotificationQuery): Promise<NotificationItem[]> {
    try {
      const response = await api.get('/notifications/', {
        params: query,
      });
      const data = unwrapData<any>(response.data);
      
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.items)) return data.items;
      if (data && Array.isArray(data.data)) return data.data;
      
      return [];
    } catch (error) {
      console.log('[NotificationService] Error fetching notifications:', error);
      return [];
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    await api.post(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/read-all');
  },

  /**
   * Sends the FCM/Push token to the backend.
   * Target endpoint: POST /api/v1/profile/device-token
   */
  async saveDeviceToken(token: string): Promise<void> {
    try {
      await api.post('/profile/device-token', {
        token,
        device_os: Platform.OS,
        device_name: Device.modelName || 'Unknown Device',
      });
      console.log('[NotificationService] Device token synced successfully');
    } catch (error: any) {
      // We don't want to block the app if this fails, but we should log it
      console.warn('[NotificationService] Failed to sync device token:', error.response?.status, error.message);
    }
  },
};
