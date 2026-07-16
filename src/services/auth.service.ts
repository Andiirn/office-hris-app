import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import {
  ForgotPasswordRequestPayload,
  ForgotPasswordRequestResponse,
  ForgotPasswordResetPayload,
  ForgotPasswordVerifyOtpPayload,
  ForgotPasswordVerifyOtpResponse,
  LoginResponse
} from '../types/auth';
import { ProfileData } from '../types/profile';
import { normalizeRole } from '../core/auth/rbac';
import { getStableDeviceFingerprint } from '../core/auth/device-fingerprint';

export const authService = {
  async login(nik: string, password: string): Promise<LoginResponse> {
    const deviceFingerprint = await getStableDeviceFingerprint();
    const payload = {
      nik,
      password,
      device_fingerprint: deviceFingerprint,
      device_name: Device.modelName || Device.deviceName || 'unknown',
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

  async getProfile(): Promise<ProfileData> {
    try {
      const response = await api.get('/profile');
      const rawData = unwrapData<any>(response.data);
      return {
        ...rawData,
        role: normalizeRole(rawData.role),
        company_id: rawData.company?.id || rawData.company_id || null,
        division_id: rawData.division?.id || rawData.division_id || null,
        position_name: rawData.position?.name || rawData.position_name || null,
        department_name: rawData.division?.name || rawData.department_name || null,
        branch_name: rawData.branch?.name || rawData.branch_name || null,
      };
    } catch (error: any) {
      console.warn('[AuthService] Get Profile failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  async updatePassword(payload: import('../types/auth').ChangePasswordPayload): Promise<void> {
    try {
      await api.patch('/profile/password', payload);
    } catch (error: any) {
      console.warn('[AuthService] Update Password failed:', error.response?.data?.message || error.message);
      throw error;
    }
  },

  async requestForgotPassword(payload: ForgotPasswordRequestPayload): Promise<ForgotPasswordRequestResponse> {
    const response = await api.post('/auth/forgot-password/request', payload);
    return unwrapData<ForgotPasswordRequestResponse>(response.data);
  },

  async verifyForgotPasswordOtp(payload: ForgotPasswordVerifyOtpPayload): Promise<ForgotPasswordVerifyOtpResponse> {
    const response = await api.post('/auth/forgot-password/verify-otp', payload);
    return unwrapData<ForgotPasswordVerifyOtpResponse>(response.data);
  },

  async resendForgotPasswordOtp(nik: string): Promise<ForgotPasswordRequestResponse> {
    const response = await api.post('/auth/forgot-password/resend-otp', { nik });
    return unwrapData<ForgotPasswordRequestResponse>(response.data);
  },

  async resetForgotPassword(payload: ForgotPasswordResetPayload): Promise<void> {
    await api.post('/auth/forgot-password/reset', payload);
  },
};
