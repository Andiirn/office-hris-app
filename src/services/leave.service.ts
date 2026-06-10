import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { CreateLeaveRequest, LeaveBalance, LeaveHistoryQuery, LeaveRequest, LeaveType } from '../types/leave';

export const leaveService = {
  async getBalances(employeeId: string, year: number): Promise<LeaveBalance[]> {
    const response = await api.get(`/leave/balances/${employeeId}`, {
      params: { year },
    });
    const raw = unwrapData<any>(response.data);

    if (Array.isArray(raw)) return raw as LeaveBalance[];
    if (Array.isArray(raw?.items)) return raw.items as LeaveBalance[];
    if (Array.isArray(raw?.balances)) return raw.balances as LeaveBalance[];
    if (raw && typeof raw === 'object') {
      const values = Object.values(raw).filter((v) => v && typeof v === 'object');
      if (values.length > 0) return values as LeaveBalance[];
    }

    return [];
  },

  async getRequests(query: LeaveHistoryQuery): Promise<LeaveRequest[]> {
    const response = await api.get('/leave/requests', {
      params: query,
    });
    const data = unwrapData<any>(response.data);
    
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.data)) return data.data;
    
    return [];
  },

  async createRequest(payload: CreateLeaveRequest): Promise<LeaveRequest> {
    const response = await api.post('/leave/requests', payload);
    return unwrapData<LeaveRequest>(response.data);
  },

  async uploadDocument(requestId: string, file: { uri: string; name: string; type?: string | null }): Promise<void> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/octet-stream',
    } as any);

    await api.post(`/leave/requests/${requestId}/upload-document`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async cancelRequest(requestId: string): Promise<void> {
    await api.post(`/leave/requests/${requestId}/cancel`);
  },

  async getTypes(companyId?: string | null): Promise<LeaveType[]> {
    const response = await api.get('/leave/types', {
      params: companyId ? { company_id: companyId, is_active: true, limit: 100 } : { is_active: true, limit: 100 },
    });
    const data = unwrapData<any>(response.data);

    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    
    return [];
  },
};
