import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { LoginResponse } from '../types/auth';

export const authService = {
  async login(nik: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/auth/login', {
      nik,
      password,
      device_fingerprint: '',
      device_name: 'Expo App',
      device_os: '',
    });
    return unwrapData<LoginResponse>(response.data);
  },
};
