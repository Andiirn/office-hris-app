import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { 
  CreateOvertimeRequest, 
  OvertimeHistoryQuery, 
  OvertimeRecord, 
  OvertimeSummary,
  UpdateOvertimeRequest,
} from '../types/overtime';

function stripNullishFields<T extends object>(payload: T): T {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== undefined),
  ) as T;
}

export const overtimeService = {
  async getSummary(employeeId: string, params: { year: number; month: number }): Promise<OvertimeSummary> {
    const response = await api.get(`/overtime/summary/${employeeId}`, {
      params,
    });
    return unwrapData<OvertimeSummary>(response.data);
  },

  async listRecords(query: OvertimeHistoryQuery): Promise<OvertimeRecord[]> {
    const response = await api.get('/overtime/records', {
      params: query,
    });
    const data = unwrapData<any>(response.data);
    
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.data)) return data.data;
    
    return [];
  },

  async getRecords(query: OvertimeHistoryQuery): Promise<OvertimeRecord[]> {
    return this.listRecords(query);
  },

  async createRecord(payload: CreateOvertimeRequest): Promise<OvertimeRecord> {
    const response = await api.post('/overtime/records', stripNullishFields(payload));
    return unwrapData<OvertimeRecord>(response.data);
  },

  async updateRecord(recordId: string, payload: UpdateOvertimeRequest): Promise<OvertimeRecord> {
    const response = await api.put(`/overtime/records/${recordId}`, stripNullishFields({
      ...payload,
      notes: payload.reason ?? undefined,
    }));
    return unwrapData<OvertimeRecord>(response.data);
  },

  async getRecordDetail(recordId: string): Promise<OvertimeRecord> {
    const response = await api.get(`/overtime/records/${recordId}`);
    return unwrapData<OvertimeRecord>(response.data);
  },
};
