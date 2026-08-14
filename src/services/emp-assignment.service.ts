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

export interface EmpStoreItem {
  id: string;
  name?: string | null;
  code?: string | null;
  address?: string | null;
  shifts?: EmpStoreShift[] | null;
}

export const EmpAssignmentService = {
  async getAllAssignedStoresByEmployeeId(employeeId: string): Promise<EmpStoreItem[]> {
    const storesMap = new Map<string, EmpStoreItem>();

    try {
      const response = await api.get(`/employee-assignments/store/by-employee/${employeeId}`);
      const rawData = unwrapData<any>(response.data);
      if (rawData) {
        // SPG assignment can be:
        // 1. { employee_id, stores: [ { id, store_id, store: { id, name, code, shifts } }, ... ] }
        // 2. { id, store_id, store: { id, name, code, shifts } }
        // 3. Array of assignments: [ { store_id, store: { ... } }, ... ]
        // 4. { items: [ ... ] } or { data: [ ... ] }
        const storesArray = Array.isArray(rawData.stores)
          ? rawData.stores
          : Array.isArray(rawData)
            ? rawData
            : Array.isArray(rawData.items)
              ? rawData.items
              : Array.isArray(rawData.data)
                ? rawData.data
                : [rawData];

        for (const item of storesArray) {
          const storeObj = item?.store || (item?.id ? item : null);
          const storeId = storeObj?.id || item?.store_id;
          if (storeId && !storesMap.has(storeId)) {
            storesMap.set(storeId, {
              id: storeId,
              name: storeObj?.name || storeObj?.code || 'Toko SPG',
              code: storeObj?.code,
              address: storeObj?.address,
              shifts: storeObj?.shifts || null,
            });
          }
        }
      }
    } catch (err) {
      // Ignore SPG fail
    }

    try {
      const mdRes = await api.get(`/employee-assignments/md-store/by-employee/${employeeId}`);
      const mdData = unwrapData<any>(mdRes.data);
      const mdItems = Array.isArray(mdData)
        ? mdData
        : Array.isArray(mdData?.stores)
          ? mdData.stores
          : Array.isArray(mdData?.items)
            ? mdData.items
            : Array.isArray(mdData?.data)
              ? mdData.data
              : mdData
                ? [mdData]
                : [];

      for (const item of mdItems) {
        const storeObj = item?.store || (item?.id ? item : null);
        const storeId = storeObj?.id || item?.store_id;
        if (storeId && !storesMap.has(storeId)) {
          storesMap.set(storeId, {
            id: storeId,
            name: storeObj?.name || storeObj?.code || 'Toko MD',
            code: storeObj?.code,
            address: storeObj?.address,
            shifts: storeObj?.shifts || null,
          });
        }
      }
    } catch (mdErr) {
      // Ignore MD fail
    }

    return Array.from(storesMap.values());
  },

  async getActiveStoreAssignmentByEmployeeId(employeeId: string): Promise<EmpStoreAssignment | null> {
    let data: EmpStoreAssignment | null = null;
    try {
      const response = await api.get(`/employee-assignments/store/by-employee/${employeeId}`);
      const rawData = unwrapData<any>(response.data);
      if (rawData) {
        if (rawData.store?.id) {
          data = rawData as EmpStoreAssignment;
        } else if (Array.isArray(rawData.stores) && rawData.stores.length > 0) {
          const firstItem = rawData.stores[0];
          data = {
            id: firstItem.id || rawData.id || 'assign-1',
            employee_id: rawData.employee_id || employeeId,
            store_id: firstItem.store_id || firstItem.store?.id,
            effective_date: firstItem.effective_date,
            end_date: firstItem.end_date,
            employee: rawData.employee,
            store: firstItem.store,
            created_at: firstItem.created_at,
          };
        } else if (Array.isArray(rawData) && rawData.length > 0) {
          const firstItem = rawData[0];
          data = {
            id: firstItem.id,
            employee_id: firstItem.employee_id || employeeId,
            store_id: firstItem.store_id || firstItem.store?.id,
            effective_date: firstItem.effective_date,
            end_date: firstItem.end_date,
            employee: firstItem.employee,
            store: firstItem.store,
            created_at: firstItem.created_at,
          };
        }
      }
    } catch (err) {
      console.warn('[EmpAssignmentService] SPG assignment check failed, trying MD assignment...', err);
    }

    if (!data) {
      try {
        const mdRes = await api.get(`/employee-assignments/md-store/by-employee/${employeeId}`);
        const mdData = unwrapData<any>(mdRes.data);
        const mdItems = Array.isArray(mdData)
          ? mdData
          : Array.isArray(mdData?.stores)
            ? mdData.stores
            : Array.isArray(mdData?.items)
              ? mdData.items
              : Array.isArray(mdData?.data)
                ? mdData.data
                : mdData
                  ? [mdData]
                  : [];

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

  async getGeneralShifts(): Promise<EmpStoreShift[]> {
    try {
      const response = await api.get('/shifts', {
        params: { is_active: true, limit: 100 },
      });
      const rawData = unwrapData<any>(response.data);
      const items = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.items)
          ? rawData.items
          : Array.isArray(rawData?.data)
            ? rawData.data
            : [];
      return items.map((s: any) => ({
        id: s.id || s.shift_id || String(Math.random()),
        name: s.name || s.shift_name || s.code || 'Shift',
        code: s.code || s.name || s.shift_name || 'SHIFT',
        start_time: s.start_time || s.checkin_time,
        end_time: s.end_time || s.checkout_time,
      }));
    } catch (err) {
      console.warn('Failed to fetch general shifts:', err);
      return [];
    }
  },
};
