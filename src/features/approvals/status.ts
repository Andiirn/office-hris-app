import { ApprovalItem } from '../../types/approval';

export function isPendingApproval(item: ApprovalItem): boolean {
  const state = String(item.action || item.status || '').toUpperCase();
  return state === 'PENDING' || state === 'IN_PROGRESS';
}

export function hasUserActedOnApproval(item: ApprovalItem, userId?: string | null): boolean {
  if (!userId) return false;
  return (item.histories ?? []).some((history) => {
    const action = String(history.action || '').toUpperCase();
    return history.approver_id === userId && (action === 'APPROVE' || action === 'REJECT');
  });
}

export function isApprovalPendingForUser(item: ApprovalItem, userId?: string | null): boolean {
  return isPendingApproval(item) && !hasUserActedOnApproval(item, userId);
}

export function isApprovalInHistoryForUser(item: ApprovalItem, userId?: string | null): boolean {
  return hasUserActedOnApproval(item, userId);
}

export function getApprovalStatusLabel(item: ApprovalItem, userId?: string | null): string {
  if (userId && Array.isArray(item.histories)) {
    const userHistory = item.histories.find((h) => h.approver_id === userId);
    if (userHistory?.action) {
      const act = String(userHistory.action).toUpperCase();
      if (act === 'APPROVE' || act === 'APPROVED') return 'Disetujui';
      if (act === 'REJECT' || act === 'REJECTED') return 'Ditolak';
    }
  }

  const state = String(item.action || item.status || '').toUpperCase();
  if (state === 'APPROVED' || state === 'APPROVE') return 'Disetujui';
  if (state === 'REJECTED' || state === 'REJECT') return 'Ditolak';
  if (state === 'IN_PROGRESS') return 'Diproses';
  if (state === 'PENDING') return 'Menunggu';
  return state || 'Menunggu';
}

export function getApprovalStatusBadgeType(item: ApprovalItem, userId?: string | null): 'warning' | 'primary' | 'secondary' | 'error' | 'muted' {
  if (userId && Array.isArray(item.histories)) {
    const userHistory = item.histories.find((h) => h.approver_id === userId);
    if (userHistory?.action) {
      const act = String(userHistory.action).toUpperCase();
      if (act === 'APPROVE' || act === 'APPROVED') return 'secondary';
      if (act === 'REJECT' || act === 'REJECTED') return 'error';
    }
  }

  const state = String(item.action || item.status || '').toUpperCase();
  if (state === 'IN_PROGRESS') return 'primary';
  if (state === 'PENDING') return 'warning';
  if (state === 'APPROVED' || state === 'APPROVE') return 'secondary';
  if (state === 'REJECTED' || state === 'REJECT') return 'error';
  return 'muted';
}

export function buildApprovalHistoryLines(item: ApprovalItem): string[] {
  return [...(item.histories ?? [])]
    .sort((a, b) => (a.level_order ?? 0) - (b.level_order ?? 0))
    .map((history) => {
      const level = history.level_order ?? 0;
      const action = String(history.action || '').toUpperCase();
      const approver = history.approver?.full_name || 'Tim';
      const label = action === 'REJECT' || action === 'REJECTED' ? 'Ditolak' : 'Disetujui';
      return `Level ${level}: ${label} oleh ${approver}`;
    });
}
