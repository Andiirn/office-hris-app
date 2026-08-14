import { Platform } from 'react-native';
import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { AttendanceActionResponse, AttendanceItem, AttendanceListQuery, AttendancePeriodQuery, CheckinRequest, CheckoutRequest, SelfieTimemarkPayload, SelfieTimemarkRequest, SelfieUploadFile, VisitItem, VisitListQuery, VisitRequest } from '../types/attendance';
import { AttendanceCorrection, CorrectionListQuery, CorrectionRequest } from '../types/correction';

const devLog = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

const devError = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

const toLocalDateTimeMillis = (value?: string | null) => {
  if (!value) return 0;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsed = Date.parse(normalized);
  if (Number.isFinite(parsed)) return parsed;

  const dateOnly = value.split('T')[0].split(' ')[0];
  const localParsed = Date.parse(`${dateOnly}T00:00:00`);
  return Number.isFinite(localParsed) ? localParsed : 0;
};

const extractArray = <T>(raw: any): T[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (Array.isArray(raw.items)) return raw.items as T[];
  if (Array.isArray(raw.data)) return raw.data as T[];
  if (Array.isArray(raw.results)) return raw.results as T[];
  if (Array.isArray(raw.records)) return raw.records as T[];
  if (Array.isArray(raw.attendances)) return raw.attendances as T[];
  if (Array.isArray(raw.list)) return raw.list as T[];
  if (raw.data && typeof raw.data === 'object') {
    return extractArray<T>(raw.data);
  }
  const arrays = Object.values(raw).filter((value) => Array.isArray(value));
  if (arrays.length > 0) return arrays[0] as T[];
  return [];
};

const normalizeVisitPhotoUrl = (value?: string | null) => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://hris.javasuperfood.com';
  return `${baseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
};

export const createSelfiePhotoCode = () => {
  const prefix = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${suffix}`.replace(/[^A-Z0-9]/g, '').slice(0, 14);
};

export const buildSelfieAttendancePayload = (input: SelfieTimemarkRequest): SelfieTimemarkPayload => ({
  photoCode: input.photoCode?.trim() || createSelfiePhotoCode(),
  timestamp: input.timestamp ?? Math.floor(Date.now() / 1000),
  timezoneID: input.timezoneID?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
  lat: input.lat,
  lng: input.lng,
  address: input.address?.trim() || '',
  deviceID: input.deviceID,
  deviceModel: input.deviceModel,
  selected_shift_id: input.selected_shift_id || null,
});

const buildSelfieFormData = (input: SelfieTimemarkRequest, selfiePhoto: SelfieUploadFile) => {
  const payload = buildSelfieAttendancePayload(input);
  const formData = new FormData();
  formData.append('selfie_photo', {
    uri: selfiePhoto.uri,
    name: selfiePhoto.name?.trim() || `${payload.photoCode}.jpg`,
    type: selfiePhoto.type || 'image/jpeg',
  } as any);
  formData.append('photoCode', payload.photoCode);
  formData.append('timestamp', String(payload.timestamp));
  formData.append('timezoneID', payload.timezoneID);
  formData.append('lat', String(payload.lat));
  formData.append('lng', String(payload.lng));
  formData.append('address', payload.address);
  formData.append('deviceID', payload.deviceID);
  formData.append('deviceModel', payload.deviceModel);
  if (payload.selected_shift_id) {
    formData.append('selected_shift_id', payload.selected_shift_id);
    formData.append('shift_id', payload.selected_shift_id);
  }
  return formData;
};

export const attendanceService = {
  async getEmployeeAttendancePeriod(employeeId: string, query?: AttendancePeriodQuery): Promise<AttendanceItem[]> {
    const response = await api.get(`/attendance/employee/${employeeId}/period`, {
      params: query,
    });
    const data = unwrapData<any>(response.data);
    const result = extractArray<AttendanceItem>(data);
    result.sort((a, b) => toLocalDateTimeMillis(b.attendance_date || b.date || (b as any).created_at) - toLocalDateTimeMillis(a.attendance_date || a.date || (a as any).created_at));
    return result;
  },

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

  async checkinSelfie(payload: SelfieTimemarkRequest, selfiePhoto: SelfieUploadFile): Promise<AttendanceActionResponse> {
    const response = await api.post('/attendance/selfie/checkin', buildSelfieFormData(payload, selfiePhoto), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapData<AttendanceActionResponse>(response.data);
  },

  async checkoutSelfie(payload: SelfieTimemarkRequest, selfiePhoto: SelfieUploadFile): Promise<AttendanceActionResponse> {
    const response = await api.post('/attendance/selfie/checkout', buildSelfieFormData(payload, selfiePhoto), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapData<AttendanceActionResponse>(response.data);
  },
  async getTodayRecord(_employeeId?: string): Promise<AttendanceItem | null> {
    const response = await api.get('/attendance/open-checkin');
    const data = unwrapData<AttendanceItem | null>(response.data);
    return data ?? null;
  },
  async getTodayRecords(_employeeId?: string): Promise<AttendanceItem[]> {
    const record = await attendanceService.getTodayRecord();
    return record ? [record] : [];
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
      let result: AttendanceItem[] = extractArray<AttendanceItem>(data);

      // Sort by date descending (newest first)
      result.sort((a, b) => {
        const dateA = toLocalDateTimeMillis(a.attendance_date || a.date || (a as any).created_at);
        const dateB = toLocalDateTimeMillis(b.attendance_date || b.date || (b as any).created_at);
        return dateB - dateA;
      });

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
      const { year, month, ...apiQuery } = query || {};
      const resolvedQuery = year && month ? (() => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        const pad = (value: number) => String(value).padStart(2, '0');
        return {
          ...apiQuery,
          date_from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
          date_to: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
        };
      })() : apiQuery;
      const response = await api.get('/attendance/visit', {
        params: resolvedQuery,
      });
      const data = unwrapData<any>(response.data);

      const rawItems = Array.isArray(data)
        ? data
        : data && Array.isArray(data.items)
          ? data.items
          : data && Array.isArray(data.data)
            ? data.data
            : [];

      return rawItems.map((item: VisitItem) => ({
        ...item,
        visit_photo_url: normalizeVisitPhotoUrl(item.visit_photo_url),
      }));
    } catch (error: any) {
      devError('[AttendanceService] listVisits error:', error?.message);
      return [];
    }
  },

  async requestVisit(payload: VisitRequest): Promise<any> {
    const formData = new FormData();
    formData.append('gps_lat', String(payload.gps_lat));
    formData.append('gps_long', String(payload.gps_long));
    formData.append('visit_date', payload.visit_date);
    formData.append('visit_time', payload.visit_time);
    formData.append('reason', payload.reason);
    formData.append('location_name', payload.location_name);
    if (payload.photo?.uri) {
      formData.append('photo', {
        uri: payload.photo.uri,
        name: payload.photo.name,
        type: payload.photo.type || 'image/jpeg',
      } as any);
    }

    const response = await api.post('/attendance/visit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapData<any>(response.data);
  },

  async approveVisit(visitId: string): Promise<any> {
    const response = await api.post(`/attendance/visit/${visitId}/approve`);
    return unwrapData<any>(response.data);
  },

  async rejectVisit(visitId: string, reason: string): Promise<any> {
    const response = await api.post(`/attendance/visit/${visitId}/reject`, {
      reason,
    });
    return unwrapData<any>(response.data);
  },

  async listCorrections(query?: CorrectionListQuery): Promise<AttendanceCorrection[]> {
    try {
      devLog('[AttendanceService] Fetching corrections with query:', JSON.stringify(query));
      const { year, month, ...apiQuery } = query || {};
      const resolvedQuery = year && month ? (() => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        const pad = (value: number) => String(value).padStart(2, '0');
        return {
          ...apiQuery,
          date_from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
          date_to: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
        };
      })() : apiQuery;
      const response = await api.get('/attendance/corrections', {
        params: resolvedQuery,
      });
      const data = unwrapData<any>(response.data);

      return extractArray<AttendanceCorrection>(data);
    } catch (error: any) {
      devError('[AttendanceService] listCorrections error:', error?.message);
      return [];
    }
  },

  async createCorrection(payload: CorrectionRequest): Promise<AttendanceCorrection> {
    const response = await api.post('/attendance/corrections', payload);
    return unwrapData<AttendanceCorrection>(response.data);
  },

  async getCorrectionDetail(correctionId: string): Promise<AttendanceCorrection> {
    const response = await api.get(`/attendance/corrections/${correctionId}`);
    return unwrapData<AttendanceCorrection>(response.data);
  },
};
