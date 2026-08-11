import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';

export interface EmpStoreShift {
  id: string;
  name?: string | null;
  code?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface EmpStoreAssignment {
  id: string;
  employee_id: string;
  store_id: string;
  effective_date?: string | null;
  end_date?: string | null;
  employee?: {
    id: string;
    full_name?: string | null;
    nik?: string | null;
    photo_url?: string | null;
  } | null;
  store?: {
    id: string;
    code?: string | null;
    name?: string | null;
    shifts?: EmpStoreShift[] | null;
  } | null;
  created_at?: string | null;
}

export const EmpAssignmentService = {
  async getActiveStoreAssignmentByEmployeeId(employeeId: string): Promise<EmpStoreAssignment | null> {
    let data: EmpStoreAssignment | null = null;
    try {
      const response = await api.get(`/employee-assignments/store/by-employee/${employeeId}`);
      data = unwrapData<EmpStoreAssignment | null>(response.data);
    } catch (err) {
      console.warn('[EmpAssignmentService] SPG assignment check failed, trying MD assignment...', err);
    }

    if (!data) {
      try {
        const mdRes = await api.get(`/employee-assignments/md-store/by-employee/${employeeId}`);
        const mdData = unwrapData<any>(mdRes.data);
        const mdItems = Array.isArray(mdData) ? mdData : mdData?.items || (mdData ? [mdData] : []);
        if (mdItems.length > 0) {
          const first = mdItems[0];
          data = {
            id: first.id,
            employee_id: first.md_employee_id || employeeId,
            store_id: first.store_id || first.store?.id,
            effective_date: first.effective_date,
            end_date: first.end_date,
            employee: first.md_employee || first.employee,
            store: first.store,
            created_at: first.created_at,
          };
        }
      } catch (mdErr) {
        console.warn('[EmpAssignmentService] MD store assignment check also failed:', mdErr);
      }
    }

    if (!data) return null;

    const storeId = data.store_id || data.store?.id;
    let rawShifts: any[] = Array.isArray(data.store?.shifts) ? data.store!.shifts : [];

    if (storeId && rawShifts.length === 0) {
      try {
        const shiftsRes = await api.get(`/stores/${storeId}/shifts`);
        const fetchedRaw = unwrapData<any>(shiftsRes.data);
        rawShifts = Array.isArray(fetchedRaw)
          ? fetchedRaw
          : Array.isArray(fetchedRaw?.data)
            ? fetchedRaw.data
            : [];
      } catch (err) {
        console.warn('[EmpAssignmentService] Failed to fetch store shifts for storeId:', storeId, err);
      }
    }

    if (rawShifts.length > 0) {
      const normalizedShifts: EmpStoreShift[] = rawShifts.map((s: any) => ({
        id: s.id || s.shift_id || String(Math.random()),
        name: s.shift_name || s.name || s.code || 'Shift',
        code: s.code || s.shift_name || 'SHIFT',
        start_time: s.checkin_time || s.start_time,
        end_time: s.checkout_time || s.end_time,
      }));

      if (data.store) {
        data.store.shifts = normalizedShifts;
      } else if (storeId) {
        data.store = { id: storeId, shifts: normalizedShifts };
      }
    }

    return data;
  },

  async getStoreShifts(storeId: string): Promise<EmpStoreShift[]> {
    try {
      const response = await api.get(`/stores/${storeId}/shifts`);
      const rawShifts = unwrapData<any>(response.data);
      const shiftsArray = Array.isArray(rawShifts)
        ? rawShifts
        : Array.isArray(rawShifts?.data)
          ? rawShifts.data
          : [];
      return shiftsArray.map((s: any) => ({
        id: s.id || s.shift_id || String(Math.random()),
        name: s.shift_name || s.name || s.code || 'Shift',
        code: s.code || s.shift_name || 'SHIFT',
        start_time: s.checkin_time || s.start_time,
        end_time: s.checkout_time || s.end_time,
      }));
    } catch (err) {
      console.warn('Failed to fetch store shifts:', err);
      return [];
    }
  },
};
