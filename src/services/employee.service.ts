import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';

export interface Colleague {
  id: string;
  nik: string;
  full_name: string;
  position_name?: string | null;
}

export const employeeService = {
  async getColleagues(divisionId?: string | null, search?: string): Promise<Colleague[]> {
    const params: Record<string, any> = { is_active: true, limit: 30 };
    if (divisionId) params.division_id = divisionId;
    if (search) params.search = search;
    
    try {
      const response = await api.get('/employees/', { params });
      const raw = unwrapData<any>(response.data);

      if (Array.isArray(raw)) return raw as Colleague[];
      if (raw && Array.isArray(raw.items)) return raw.items as Colleague[];
      if (raw && Array.isArray(raw.data)) return raw.data as Colleague[];
      return [];
    } catch (error) {
      console.warn('[EmployeeService] getColleagues failed:', error);
      return [];
    }
  },
};
