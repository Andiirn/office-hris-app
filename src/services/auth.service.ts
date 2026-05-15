import { Platform } from 'react-native';
import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { LoginResponse } from '../types/auth';

export const authService = {
  async login(nik: string, password: string): Promise<LoginResponse> {
    const payload = {
      nik,
      password,
      device_fingerprint: 'local-dev-id',
      device_name: 'Expo App Local',
      device_os: Platform.OS,
    };

    try {
      const response = await api.post('/auth/login', payload);
      return unwrapData<LoginResponse>(response.data);
    } catch (error: any) {
      console.warn('[AuthService] Login failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  async getProfile(): Promise<any> {
    try {
      const response = await api.get('/profile');
      return unwrapData<any>(response.data);
    } catch (error: any) {
      console.warn('[AuthService] Get Profile failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },
};
