import { api } from '../../core/api/client';
import { EmpAssignmentService } from '../emp-assignment.service';

jest.mock('../../core/api/client', () => ({
  api: {
    get: jest.fn(),
  },
}));

describe('employeeAssignmentService', () => {
  it('gets active store assignment by employee id', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          id: 'assign-1',
          employee_id: 'emp-1',
          store: {
            id: 'store-1',
            name: 'Store A',
            code: 'SA',
            shifts: [
              { id: 'shift-1', name: 'Pagi', code: 'PG' },
            ],
          },
        },
      },
    });

    await expect(
      EmpAssignmentService.getActiveStoreAssignmentByEmployeeId('emp-1')
    ).resolves.toEqual({
      id: 'assign-1',
      employee_id: 'emp-1',
      store: {
        id: 'store-1',
        name: 'Store A',
        code: 'SA',
        shifts: [
          { id: 'shift-1', name: 'Pagi', code: 'PG' },
        ],
      },
    });

    expect(api.get).toHaveBeenCalledWith('/employee-assignments/store/by-employee/emp-1');
  });

  it('getAllAssignedStoresByEmployeeId handles SPG multi-store response with stores array', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/employee-assignments/store/by-employee/emp-1')) {
        return Promise.resolve({
          data: {
            data: {
              employee_id: 'emp-1',
              stores: [
                {
                  id: 'assign-1',
                  store_id: 'store-1',
                  store: { id: 'store-1', name: 'Toko Alfa 1', code: 'ALF1' },
                },
                {
                  id: 'assign-2',
                  store_id: 'store-2',
                  store: { id: 'store-2', name: 'Toko Indo 2', code: 'IND2' },
                },
              ],
            },
          },
        });
      }
      return Promise.reject(new Error('not found'));
    });

    const stores = await EmpAssignmentService.getAllAssignedStoresByEmployeeId('emp-1');

    expect(stores).toHaveLength(2);
    expect(stores[0]).toEqual({
      id: 'store-1',
      name: 'Toko Alfa 1',
      code: 'ALF1',
      address: undefined,
      shifts: null,
    });
    expect(stores[1]).toEqual({
      id: 'store-2',
      name: 'Toko Indo 2',
      code: 'IND2',
      address: undefined,
      shifts: null,
    });
  });

  it('getAllAssignedStoresByEmployeeId handles MD store assignments and deduplicates stores', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/employee-assignments/store/by-employee/emp-1')) {
        return Promise.resolve({
          data: {
            data: {
              employee_id: 'emp-1',
              stores: [
                {
                  id: 'assign-1',
                  store_id: 'store-1',
                  store: { id: 'store-1', name: 'Toko Alfa 1', code: 'ALF1' },
                },
              ],
            },
          },
        });
      }
      if (url.includes('/employee-assignments/md-store/by-employee/emp-1')) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'md-assign-1',
                store_id: 'store-1',
                store: { id: 'store-1', name: 'Toko Alfa 1', code: 'ALF1' },
              },
              {
                id: 'md-assign-2',
                store_id: 'store-3',
                store: { id: 'store-3', name: 'Toko MD 3', code: 'MD3' },
              },
            ],
          },
        });
      }
      return Promise.reject(new Error('not found'));
    });

    const stores = await EmpAssignmentService.getAllAssignedStoresByEmployeeId('emp-1');

    expect(stores).toHaveLength(2);
    expect(stores.map((s) => s.id)).toEqual(['store-1', 'store-3']);
  });

  it('getAllAssignedStoresByEmployeeId queries MD endpoints when category is md', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/employee-assignments/md-store?md_employee_id=md-emp-1')) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'md-assign-1',
                md_employee_id: 'md-emp-1',
                store_id: 'store-md-100',
                store: { id: 'store-md-100', name: 'Superindo MD 1', code: 'SMD1' },
              },
            ],
          },
        });
      }
      return Promise.reject(new Error('not found'));
    });

    const stores = await EmpAssignmentService.getAllAssignedStoresByEmployeeId('md-emp-1', 'md');

    expect(stores).toHaveLength(1);
    expect(stores[0]).toEqual({
      id: 'store-md-100',
      name: 'Superindo MD 1',
      code: 'SMD1',
      address: undefined,
      shifts: null,
    });
    expect(api.get).toHaveBeenCalledWith('/employee-assignments/md-store?md_employee_id=md-emp-1');
  });

  it('fetches general shifts directly from /shifts endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [
          { id: 'gen-shift-1', name: 'Shift Non-SPG Pagi', code: 'NSPG1', start_time: '08:00', end_time: '17:00' },
          { id: 'gen-shift-2', name: 'Shift Non-SPG Malam', code: 'NSPG2', start_time: '20:00', end_time: '05:00' },
        ],
      },
    });

    const shifts = await EmpAssignmentService.getGeneralShifts();

    expect(shifts).toEqual([
      { id: 'gen-shift-1', name: 'Shift Non-SPG Pagi', code: 'NSPG1', start_time: '08:00', end_time: '17:00' },
      { id: 'gen-shift-2', name: 'Shift Non-SPG Malam', code: 'NSPG2', start_time: '20:00', end_time: '05:00' },
    ]);
    expect(api.get).toHaveBeenCalledWith('/shifts', { params: { is_active: true, limit: 100 } });
  });
});
