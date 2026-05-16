import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { 
  CreateResignRequest, 
  ResignHistoryQuery, 
  ResignRequest 
} from '../types/resign';

export const resignService = {
  async getMyRequests(query?: ResignHistoryQuery): Promise<ResignRequest[]> {
    const response = await api.get('/resign/requests/my', {
      params: query,
    });
    const data = unwrapData<any>(response.data);
    
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.data)) return data.data;
    
    return [];
  },

  async submitRequest(payload: CreateResignRequest): Promise<ResignRequest> {
    const response = await api.post('/resign/requests', payload);
    return unwrapData<ResignRequest>(response.data);
  },

  async getRequestDetail(resignId: string): Promise<ResignRequest> {
    const response = await api.get(`/resign/requests/${resignId}`);
    return unwrapData<ResignRequest>(response.data);
  },

  async deleteRequest(resignId: string): Promise<void> {
    await api.delete(`/resign/requests/${resignId}`);
  },
};
