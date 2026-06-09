import { api } from '../../core/api/client';
import { approvalService } from '../approval.service';

jest.mock('../../core/api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('approvalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getPending fetches and normalizes pending approvals', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 'app-1',
            module_name: 'LEAVE',
            reference_id: 'ref-123',
            reference_type: 'Annual Leave',
            current_level: 1,
            max_level: 2,
            status: 'PENDING',
            created_at: '2026-06-08T12:00:00Z',
            requester: {
              id: 'emp-99',
              full_name: 'Budi Santoso',
              nik: '26019382',
            },
            reference_detail: {
              reason: 'Holiday',
            },
          },
        ],
      },
    });

    const result = await approvalService.getPending({ page: 1, limit: 10 });

    expect(api.get).toHaveBeenCalledWith('/approvals/pending', {
      params: { page: 1, limit: 10 },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'app-1',
      module_name: 'LEAVE',
      reference_id: 'ref-123',
      reference_type: 'Annual Leave',
      current_level: 1,
      max_level: 2,
      status: 'PENDING',
      created_at: '2026-06-08T12:00:00Z',
      requester: {
        id: 'emp-99',
        full_name: 'Budi Santoso',
        nik: '26019382',
      },
      reference_detail: {
        reason: 'Holiday',
      },
      module: 'LEAVE',
      request_id: 'ref-123',
      employee_name: 'Budi Santoso',
      requested_at: '2026-06-08T12:00:00Z',
      description: 'Annual Leave request',
    });
  });

  it('getHistory fetches and normalizes history approvals', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: 'app-2',
            module_name: 'OVERTIME',
            reference_id: 'ref-456',
            reference_type: 'Overtime Work',
            current_level: 1,
            max_level: 1,
            status: 'APPROVED',
            created_at: '2026-06-08T15:00:00Z',
            requester: null,
            reference_detail: null,
          },
        ],
      },
    });

    const result = await approvalService.getHistory();

    expect(api.get).toHaveBeenCalledWith('/approvals/history', {
      params: undefined,
    });
    expect(result).toHaveLength(1);
    expect(result[0].employee_name).toBe('Karyawan');
    expect(result[0].description).toBe('Overtime Work request');
  });

  it('processAction sends approval request', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
      },
    });

    await approvalService.processAction('app-1', 'APPROVE', 'Looks good');

    expect(api.post).toHaveBeenCalledWith('/approvals/app-1/action', {
      action: 'APPROVE',
      comment: 'Looks good',
    });
  });
});
