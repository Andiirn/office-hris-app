import { Platform } from 'react-native';
import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { AttendanceActionResponse, AttendanceItem, AttendanceListQuery, CheckinRequest, CheckoutRequest, VisitItem, VisitListQuery, VisitRequest } from '../types/attendance';
import { AttendanceCorrection, CorrectionListQuery, CorrectionRequest } from '../types/correction';

const devLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

const devError = (...args: unknown[]) => {
  if (__DEV__) {
    console.error(...args);
  }
};

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
      devLog('[AttendanceService] Fetching history with query:', JSON.stringify(query));
      const response = await api.get('/attendance/', {
        params: query,
      });
      
      const baseURL = response.config?.baseURL || '';
      const requestUrl = response.config?.url || '';
      devLog('[AttendanceService] Full URL:', `${baseURL}${requestUrl}`);
      
      const data: any = unwrapData(response.data);
      devLog('[AttendanceService] Unwrapped data sample:', JSON.stringify(Array.isArray(data) ? data.slice(0, 1) : data));

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

      devLog('[AttendanceService] Returning', result.length, 'items');
      return result;
    } catch (error: any) {
      devError('[AttendanceService] getAttendanceHistory error:', error?.message);
      return [];
    }
  },

  async listVisits(query?: VisitListQuery): Promise<VisitItem[]> {
    try {
      devLog('[AttendanceService] Fetching visits with query:', JSON.stringify(query));
      const response = await api.get('/attendance/visit', {
        params: query,
      });
      const data = unwrapData<any>(response.data);
      
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.items)) return data.items;
      if (data && Array.isArray(data.data)) return data.data;
      
      return [];
    } catch (error: any) {
      devError('[AttendanceService] listVisits error:', error?.message);
      return [];
    }
  },

  async requestVisit(payload: VisitRequest): Promise<any> {
    const response = await api.post('/attendance/visit', payload);
    return unwrapData<any>(response.data);
  },

  async listCorrections(query?: CorrectionListQuery): Promise<AttendanceCorrection[]> {
    try {
      devLog('[AttendanceService] Fetching corrections with query:', JSON.stringify(query));
      const response = await api.get('/attendance/corrections', {
        params: query,
      });
      const data = unwrapData<any>(response.data);
      
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.items)) return data.items;
      if (data && Array.isArray(data.data)) return data.data;
      if (data && data.data && Array.isArray(data.data.items)) return data.data.items;
      if (data && data.results && Array.isArray(data.results)) return data.results;
      if (data && data.data && data.data.results && Array.isArray(data.data.results)) return data.data.results;
      
      return [];
    } catch (error: any) {
      devError('[AttendanceService] listCorrections error:', error?.message);
      return [];
    }
  },

  async createCorrection(payload: CorrectionRequest): Promise<AttendanceCorrection> {
    const response = await api.post('/attendance/corrections', payload);
    return unwrapData<AttendanceCorrection>(response.data);
  },
};
