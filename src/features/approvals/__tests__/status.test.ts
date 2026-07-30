import { buildApprovalHistoryLines, getApprovalStatusBadgeType, getApprovalStatusLabel, hasUserActedOnApproval, isApprovalInHistoryForUser, isApprovalPendingForUser, isPendingApproval } from '../status';

describe('isPendingApproval', () => {
  it('treats IN_PROGRESS as pending', () => {
    expect(isPendingApproval({ id: '1', module_name: 'LEAVE', reference_id: 'r1', reference_type: 'leave_request', current_level: 1, max_level: 2, status: 'IN_PROGRESS', created_at: null, requested_at: '2026-07-30T00:00:00Z' })).toBe(true);
  });

  it('rejects approved approvals', () => {
    expect(isPendingApproval({ id: '2', module_name: 'LEAVE', reference_id: 'r2', reference_type: 'leave_request', current_level: 1, max_level: 2, status: 'APPROVED', created_at: null, requested_at: '2026-07-30T00:00:00Z' })).toBe(false);
  });

  it('labels IN_PROGRESS separately', () => {
    const item = { id: '3', module_name: 'LEAVE', reference_id: 'r3', reference_type: 'leave_request', current_level: 1, max_level: 2, status: 'IN_PROGRESS', created_at: null, requested_at: '2026-07-30T00:00:00Z' } as any;
    expect(getApprovalStatusLabel(item)).toBe('Diproses');
    expect(getApprovalStatusBadgeType(item)).toBe('primary');
  });

  it('treats approvals as history for the user who already acted', () => {
    const item = {
      id: '4',
      module_name: 'LEAVE',
      reference_id: 'r4',
      reference_type: 'leave_request',
      current_level: 2,
      max_level: 3,
      status: 'IN_PROGRESS',
      created_at: null,
      requested_at: '2026-07-30T00:00:00Z',
      histories: [
        { id: 'h1', approver_id: 'mgr-1', level_order: 1, action: 'APPROVE', comment: null, approved_at: '2026-07-30T01:00:00Z' },
      ],
    } as any;

    expect(hasUserActedOnApproval(item, 'mgr-1')).toBe(true);
    expect(isApprovalPendingForUser(item, 'mgr-1')).toBe(false);
    expect(isApprovalInHistoryForUser(item, 'mgr-1')).toBe(true);
    expect(isApprovalPendingForUser(item, 'hr-1')).toBe(true);
  });

  it('renders history lines per level and preserves reject order', () => {
    const item = {
      id: '5',
      module_name: 'LEAVE',
      reference_id: 'r5',
      reference_type: 'leave_request',
      current_level: 2,
      max_level: 3,
      status: 'REJECTED',
      created_at: null,
      requested_at: '2026-07-30T00:00:00Z',
      histories: [
        { id: 'h2', approver_id: 'hr-1', level_order: 2, action: 'REJECT', comment: 'Nope', approved_at: '2026-07-30T02:00:00Z', approver: { id: 'hr-1', full_name: 'HR Admin', nik: '1' } },
        { id: 'h1', approver_id: 'mgr-1', level_order: 1, action: 'APPROVE', comment: null, approved_at: '2026-07-30T01:00:00Z', approver: { id: 'mgr-1', full_name: 'Manager A', nik: '2' } },
      ],
    } as any;

    expect(buildApprovalHistoryLines(item)).toEqual([
      'Level 1: Disetujui oleh Manager A',
      'Level 2: Ditolak oleh HR Admin',
    ]);
  });
});
