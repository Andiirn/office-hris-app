import { api } from '../../core/api/client';
import { overtimeService } from '../overtime.service';

jest.mock('../../core/api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('overtimeService', () => {
  it('createRecord posts the overtime payload and unwraps the response', async () => {
    const payload = {
      attendance_id: null,
      overtime_date: '2026-06-05',
      start_time: '2026-06-05T04:00:00.000Z',
      end_time: '2026-06-05T06:00:00.000Z',
      overtime_type: 'REGULAR' as const,
      reason: 'Need to finish monthly report',
    };

    (api.post as jest.Mock).mockResolvedValue({
      data: {
        data: {
          id: 'overtime-1',
          ...payload,
        },
      },
    });

    const result = await overtimeService.createRecord(payload);

    expect(api.post).toHaveBeenCalledWith('/overtime/records', {
      overtime_date: '2026-06-05',
      start_time: '2026-06-05T04:00:00.000Z',
      end_time: '2026-06-05T06:00:00.000Z',
      overtime_type: 'REGULAR',
      reason: 'Need to finish monthly report',
    });
    expect(result).toMatchObject({ id: 'overtime-1', ...payload });
  });

  it('createRecord keeps attendance_id when provided', async () => {
    const payload = {
      attendance_id: 'att-1',
      overtime_date: '2026-06-05',
      start_time: '2026-06-05T04:00:00.000Z',
      end_time: '2026-06-05T06:00:00.000Z',
      overtime_type: 'REGULAR' as const,
      reason: 'Need to finish monthly report',
    };

    (api.post as jest.Mock).mockResolvedValue({
      data: { data: { id: 'overtime-2', ...payload } },
    });

    await overtimeService.createRecord(payload);

    expect(api.post).toHaveBeenCalledWith('/overtime/records', payload);
  });

  it('listRecords returns array data from wrapped responses', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: [
          { id: 'overtime-1', overtime_type: 'REGULAR' },
        ],
      },
    });

    const result = await overtimeService.listRecords({ employee_id: 'emp-1' });

    expect(api.get).toHaveBeenCalledWith('/overtime/records', {
      params: { employee_id: 'emp-1' },
    });
    expect(result).toEqual([{ id: 'overtime-1', overtime_type: 'REGULAR' }]);
  });

  it('getRecordDetail unwraps overtime detail response', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          id: 'overtime-1',
          overtime_date: '2026-06-05',
          overtime_type: 'REGULAR',
          is_approved: true,
          approved_at: '2026-06-06T08:00:00Z',
        },
      },
    });

    const result = await overtimeService.getRecordDetail('overtime-1');

    expect(api.get).toHaveBeenCalledWith('/overtime/records/overtime-1');
    expect(result).toEqual({
      id: 'overtime-1',
      overtime_date: '2026-06-05',
      overtime_type: 'REGULAR',
      is_approved: true,
      approved_at: '2026-06-06T08:00:00Z',
    });
  });
});
