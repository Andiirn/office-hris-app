import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ApprovalItem } from '../../types/approval';

export type ApprovalActivityItem = {
  id: string;
  type: 'approval.approved' | 'approval.rejected';
  origin: 'approval';
  title: string;
  summary: string;
  details: string[];
  timestamp: string;
  sortTime: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  bgColor: string;
  status: 'APPROVED' | 'REJECTED';
  isExpanded: boolean;
};

type BuilderOptions = {
  formatDateOnly: (value?: string | null) => string;
  toSortTime: (value?: string | null) => number;
};

function getApprovalTypeLabel(item: ApprovalItem) {
  const referenceType = String(item.reference_type || '').toLowerCase();
  switch (referenceType) {
    case 'overtime_record':
      return 'Lembur';
    case 'leave_request':
      return 'Cuti / Izin';
    case 'attendance_correction':
      return 'Koreksi Absen';
    case 'attendance_visit':
      return 'Dinas Luar';
    case 'resign_request':
      return 'Resign';
    default:
      return item.module_name || 'Persetujuan';
  }
}

export function buildApprovalActivityItems(items: ApprovalItem[], options: BuilderOptions): ApprovalActivityItem[] {
  return items
    .map((item) => {
      const action = String(item.action || item.status || '').toUpperCase();
      const isRejected = action === 'REJECT' || action === 'REJECTED';
      const status: 'APPROVED' | 'REJECTED' = isRejected ? 'REJECTED' : 'APPROVED';
      const type: ApprovalActivityItem['type'] = isRejected ? 'approval.rejected' : 'approval.approved';
      const origin: ApprovalActivityItem['origin'] = 'approval';
      const icon: ApprovalActivityItem['icon'] = isRejected ? 'cancel' : 'check-circle';
      const requester = item.requester_name || item.requester?.full_name || 'Karyawan';
      const approver = item.approver_name || item.approver?.full_name || 'Tim';
      const label = getApprovalTypeLabel(item);
      const processedAt = item.approved_at || item.requested_at || item.created_at || '';

      return {
        id: `approval-${item.id}`,
        type,
        origin,
        title: `${isRejected ? 'Menolak' : 'Menyetujui'} pengajuan ${label} dari ${requester}`,
        summary: `${options.formatDateOnly(processedAt)} · ${isRejected ? 'Ditolak' : 'Disetujui'} oleh ${approver}`,
        details: [
          `${approver} telah ${isRejected ? 'menolak' : 'menyetujui'} pengajuan ${label} dari ${requester}`,
          `Waktu: ${options.formatDateOnly(processedAt)}`,
        ],
        timestamp: processedAt,
        sortTime: options.toSortTime(processedAt),
        icon,
        color: isRejected ? '#93000a' : '#1f6b42',
        bgColor: isRejected ? '#ffdad6' : '#d9e6da',
        status,
        isExpanded: false,
      };
    })
    .filter((item) => Boolean(item.timestamp));
}
