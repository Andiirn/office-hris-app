import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { 
  CreateOvertimeRequest, 
  OvertimeHistoryQuery, 
  OvertimeRecord, 
  OvertimeSummary 
} from '../types/overtime';

export const overtimeService = {
  async getSummary(employeeId: string, year: number, month: number): Promise<OvertimeSummary> {
    const response = await api.get(`/overtime/summary/${employeeId}`, {
      params: { year, month },
    });
    return unwrapData<OvertimeSummary>(response.data);
  },

  async getRecords(query: OvertimeHistoryQuery): Promise<OvertimeRecord[]> {
    const response = await api.get('/overtime/records', {
      params: query,
    });
    const data = unwrapData<any>(response.data);
    
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.data)) return data.data;
    
    return [];
  },

  async createRecord(payload: CreateOvertimeRequest): Promise<OvertimeRecord> {
    const response = await api.post('/overtime/records', payload);
    return unwrapData<OvertimeRecord>(response.data);
  },

  async getRecordDetail(recordId: string): Promise<OvertimeRecord> {
    const response = await api.get(`/overtime/records/${recordId}`);
    return unwrapData<OvertimeRecord>(response.data);
  },
};
