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

  async getPhotoChallenge(): Promise<string> {
    try {
      const response = await api.get('/attendance/photo/challenge');
      return response.data?.challenge || response.data?.data?.challenge || '';
    } catch {
      // Return empty string if the endpoint doesn't exist yet so it doesn't crash the UI prototype
      return '';
    }
  },

  async checkinWithPhoto(formData: FormData): Promise<any> {
    const response = await api.post('/attendance/photo/checkin', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapData<any>(response.data);
  },

  async checkoutWithPhoto(formData: FormData): Promise<any> {
    const response = await api.post('/attendance/photo/checkout', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapData<any>(response.data);
  },
  async getTodayRecord() {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const response = await api.get('/attendance/', {
      params: { date_from: todayString, date_to: todayString, limit: 1, page: 1 },
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
};
