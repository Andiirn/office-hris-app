import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';

type LeaveBalanceItem = {
  remaining_days?: number;
};

export const leaveService = {
  async getBalances(employeeId: string, year: number): Promise<LeaveBalanceItem[]> {
    const response = await api.get(`/leave/balances/${employeeId}`, {
      params: { year },
    });
    const raw = unwrapData<any>(response.data);

    if (Array.isArray(raw)) return raw as LeaveBalanceItem[];
    if (Array.isArray(raw?.items)) return raw.items as LeaveBalanceItem[];
    if (Array.isArray(raw?.balances)) return raw.balances as LeaveBalanceItem[];
    if (raw && typeof raw === 'object') {
      // Some backends return map keyed by leave_type_id.
      const values = Object.values(raw).filter((v) => v && typeof v === 'object');
      if (values.length > 0) return values as LeaveBalanceItem[];
    }

    return [];
  },
};
