import { Platform } from 'react-native';
import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { AttendanceActionResponse, CheckinRequest, CheckoutRequest } from '../types/attendance';

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
    const data = unwrapData<any[]>(response.data);
    return Array.isArray(data) ? data[0] : undefined;
  },
};
