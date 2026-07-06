import { api } from '../../core/api/client';
import { leaveService } from '../leave.service';

jest.mock('../../core/api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('leaveService', () => {
  it('getRequests filters history by selected month while sending year to the API', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [
          { id: 'leave-1', start_date: '2026-06-10', created_at: '2026-06-10T08:00:00Z' },
          { id: 'leave-2', start_date: '2026-05-28', created_at: '2026-05-28T08:00:00Z' },
        ],
      },
    });

    const result = await leaveService.getRequests({
      employee_id: 'EMP001',
      year: 2026,
      month: 6,
      limit: 50,
    });

    expect(api.get).toHaveBeenCalledWith('/leave/requests', {
      params: {
        employee_id: 'EMP001',
        year: 2026,
        limit: 50,
      },
    });
    expect(result).toEqual([
      { id: 'leave-1', start_date: '2026-06-10', created_at: '2026-06-10T08:00:00Z' },
    ]);
  });
});
