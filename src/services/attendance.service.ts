import { Platform } from 'react-native';
import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { AttendanceActionResponse, AttendanceItem, AttendanceListQuery, CheckinRequest, CheckoutRequest } from '../types/attendance';

export const attendanceService = {
  async checkin(payload: CheckinRequest): Promise<AttendanceActionResponse> {
    const response = await api.post('/attendance/checkin', {
      ...payload,
      device_os: payload.device_os ?? Platform.OS,
      timezone: payload.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return unwrapData<AttendanceActionResponse>(response.data);
  },
  async checkout(payload: CheckoutRequest): Promise<AttendanceActionResponse> {
    const response = await api.post('/attendance/checkout', payload);
    return unwrapData<AttendanceActionResponse>(response.data);
  },
  async getTodayRecord() {
    const today = new Date().toISOString().slice(0, 10);
    const response = await api.get('/attendance/', {
      params: { date_from: today, date_to: today, limit: 1, page: 1 },
    });
    const data = unwrapData<AttendanceItem[]>(response.data);
    return Array.isArray(data) ? data[0] : undefined;
  },
  async getAttendanceHistory(query?: AttendanceListQuery): Promise<AttendanceItem[]> {
    try {
      const response = await api.get('/attendance/', {
        params: query,
      });
      console.log('[AttendanceService] URL:', response.config.url);
      console.log('[AttendanceService] Params:', JSON.stringify(response.config.params));
      console.log('[AttendanceService] Raw response:', JSON.stringify(response.data, null, 2));
      
      const data: any = unwrapData(response.data);
      console.log('[AttendanceService] Unwrapped data:', JSON.stringify(data, null, 2));

      // Handle different possible backend pagination shapes
      let result: AttendanceItem[] = [];
      if (Array.isArray(data)) {
        result = data;
      } else if (data && Array.isArray(data.items)) {
        result = data.items;
      } else if (data && Array.isArray(data.data)) {
        result = data.data;
      }

      console.log('[AttendanceService] Final processed items:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error('[AttendanceService] getAttendanceHistory error:', error);
      if (error.response) {
        console.error('[AttendanceService] Error response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  },

};
