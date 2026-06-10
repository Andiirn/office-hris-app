import { Platform } from 'react-native';
import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { AttendanceActionResponse, AttendanceItem, AttendanceListQuery, CheckinRequest, CheckoutRequest, VisitItem, VisitListQuery, VisitRequest } from '../types/attendance';

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
      console.log('[AttendanceService] Fetching history with query:', JSON.stringify(query));
      const response = await api.get('/attendance/', {
        params: query,
      });
      
      const baseURL = response.config?.baseURL || '';
      const requestUrl = response.config?.url || '';
      console.log('[AttendanceService] Full URL:', `${baseURL}${requestUrl}`);
      
      const data: any = unwrapData(response.data);
      console.log('[AttendanceService] Unwrapped data sample:', JSON.stringify(Array.isArray(data) ? data.slice(0, 1) : data));

      // Handle different possible backend pagination shapes
      let result: AttendanceItem[] = [];
      if (Array.isArray(data)) {
        result = data;
      } else if (data && Array.isArray(data.items)) {
        result = data.items;
      } else if (data && Array.isArray(data.data)) {
        result = data.data;
      } else if (data && typeof data === 'object') {
        // Fallback: check if the object itself is the wrapper and has an array property we don't know about
        const arrays = Object.values(data).filter(v => Array.isArray(v));
        if (arrays.length > 0) result = arrays[0] as AttendanceItem[];
      }

      console.log('[AttendanceService] Returning', result.length, 'items');
      return result;
    } catch (error: any) {
      console.error('[AttendanceService] getAttendanceHistory error:', error?.message);
      return [];
    }
  },

  async listVisits(query?: VisitListQuery): Promise<VisitItem[]> {
    try {
      console.log('[AttendanceService] Fetching visits with query:', JSON.stringify(query));
      const response = await api.get('/attendance/visit', {
        params: query,
      });
      const data = unwrapData<any>(response.data);
      
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.items)) return data.items;
      if (data && Array.isArray(data.data)) return data.data;
      
      return [];
    } catch (error: any) {
      console.error('[AttendanceService] listVisits error:', error?.message);
      return [];
    }
  },

  async requestVisit(payload: VisitRequest): Promise<any> {
    const response = await api.post('/attendance/visit', payload);
    return unwrapData<any>(response.data);
  },
};

