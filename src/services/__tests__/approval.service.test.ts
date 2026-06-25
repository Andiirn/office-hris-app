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
    expect(result[0]).toMatchObject({
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
      request_id: 'app-1',
      approval_request_id: 'app-1',
      employee_name: 'Budi Santoso',
      requester_name: 'Budi Santoso',
      approver_name: '',
      requested_at: '2026-06-08T12:00:00Z',
      action: 'PENDING',
      approved_at: null,
      comment: null,
      level_order: 1,
      description: 'Annual Leave request',
    });
  });

  it('getHistory fetches and normalizes history approvals', async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: '29c11aad-76c2-436d-af26-45157e2eac0c',
              approval_request_id: '5a24915b-26fb-4728-a33c-b6b40124a580',
              module_name: 'OVERTIME',
              action: 'APPROVE',
              comment: null,
              approved_at: '2026-06-25T02:29:11.763054Z',
              level_order: 1,
              approver: {
                id: '4c469191-22fc-40be-b3ba-ae08cccebed1',
                full_name: 'SITI FAIJAH',
                nik: '21066042',
                photo_url: null,
              },
              reference_id: 'b3f0d1b0-dd28-4e74-89e3-e3c9caf31e0a',
              reference_type: 'overtime_record',
            },
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 20,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: '5a24915b-26fb-4728-a33c-b6b40124a580',
            module_name: 'OVERTIME',
            reference_id: 'b3f0d1b0-dd28-4e74-89e3-e3c9caf31e0a',
            reference_type: 'overtime_record',
            requester_id: 'emp-77',
            current_level: 1,
            max_level: 4,
            status: 'APPROVED',
            created_at: '2026-06-25T02:44:22.738858Z',
            requester: {
              id: 'emp-77',
              full_name: 'BUDI KURNIAWAN',
              nik: '29001123',
              photo_url: null,
            },
            reference_detail: {
              overtime_date: '2026-06-25',
              overtime_hours: 1.5,
              overtime_type: 'REGULAR',
              overtime_amount: 50000,
            },
          },
        },
      });

    const result = await approvalService.getHistory({ page: 1, limit: 20 });

    expect(api.get).toHaveBeenNthCalledWith(1, '/approvals/history', {
      params: { page: 1, limit: 20 },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/approvals/5a24915b-26fb-4728-a33c-b6b40124a580');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '29c11aad-76c2-436d-af26-45157e2eac0c',
      module_name: 'OVERTIME',
      action: 'APPROVE',
      comment: null,
      approved_at: '2026-06-25T02:29:11.763054Z',
      level_order: 1,
      requester: {
        id: 'emp-77',
        full_name: 'BUDI KURNIAWAN',
        nik: '29001123',
        photo_url: null,
      },
      approver: {
        id: '4c469191-22fc-40be-b3ba-ae08cccebed1',
        full_name: 'SITI FAIJAH',
        nik: '21066042',
        photo_url: null,
      },
      reference_id: 'b3f0d1b0-dd28-4e74-89e3-e3c9caf31e0a',
      reference_type: 'overtime_record',
      module: 'OVERTIME',
      request_id: '5a24915b-26fb-4728-a33c-b6b40124a580',
      approval_request_id: '5a24915b-26fb-4728-a33c-b6b40124a580',
      status: 'APPROVED',
      requested_at: '2026-06-25T02:29:11.763054Z',
      requester_name: 'BUDI KURNIAWAN',
      approver_name: 'SITI FAIJAH',
      employee_name: 'BUDI KURNIAWAN',
      reference_detail: {
        overtime_date: '2026-06-25',
        overtime_hours: 1.5,
        overtime_type: 'REGULAR',
        overtime_amount: 50000,
      },
    });
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
