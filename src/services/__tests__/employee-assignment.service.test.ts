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
});
