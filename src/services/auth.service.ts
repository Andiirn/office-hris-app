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

    console.log('[AuthService] Login Request:', payload);

    try {
      const response = await api.post('/auth/login', payload);
      console.log('[AuthService] Login Response:', response.data);
      return unwrapData<LoginResponse>(response.data);
    } catch (error: any) {
      console.error('[AuthService] Login Error:', error.response?.data || error.message);
      throw error;
    }
  },
};
