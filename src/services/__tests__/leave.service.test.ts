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

  it('getRequest unwraps the detail response for a leave request', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          id: 'leave-1',
          status: 'APPROVED',
          employee: {
            full_name: 'Budi',
            photo_url: 'https://example.com/photo.jpg',
          },
        },
      },
    });

    const result = await leaveService.getRequest('leave-1');

    expect(api.get).toHaveBeenCalledWith('/leave/requests/leave-1');
    expect(result).toEqual({
      id: 'leave-1',
      status: 'APPROVED',
      employee: {
        full_name: 'Budi',
        photo_url: 'https://example.com/photo.jpg',
      },
    });
  });

  it('getTypes returns leave types including requires_document property', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [
          {
            id: 'type-1',
            name: 'Cuti Sakit',
            requires_document: true,
            max_days_per_year: 3,
            is_active: true,
          },
          {
            id: 'type-2',
            name: 'Cuti Tahunan',
            requires_document: false,
            max_days_per_year: null,
            is_active: true,
          },
        ],
      },
    });

    const result = await leaveService.getTypes('CMP001');

    expect(api.get).toHaveBeenCalledWith('/leave/types', {
      params: {
        company_id: 'CMP001',
        is_active: true,
        limit: 100,
      },
    });
    expect(result).toEqual([
      {
        id: 'type-1',
        name: 'Cuti Sakit',
        requires_document: true,
        max_days_per_year: 3,
        is_active: true,
      },
      {
        id: 'type-2',
        name: 'Cuti Tahunan',
        requires_document: false,
        max_days_per_year: null,
        is_active: true,
      },
    ]);
  });

  it('getTypes unwraps nested data arrays returned by the API', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          data: [
            {
              id: 'type-3',
              name: 'Cuti Khusus',
              requires_document: true,
              max_days_per_year: 5,
              is_active: true,
            },
          ],
        },
      },
    });

    const result = await leaveService.getTypes('CMP001');

    expect(result).toEqual([
      {
        id: 'type-3',
        name: 'Cuti Khusus',
        requires_document: true,
        max_days_per_year: 5,
        is_active: true,
      },
    ]);
  });
});
