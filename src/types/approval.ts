import { AttendanceCorrection } from './correction';
import { LeaveRequest } from './leave';
import { OvertimeRecord } from './overtime';
import { ResignRequest } from './resign';

export interface RequesterInfo {
  id: string;
  full_name: string;
  nik: string;
  photo_url?: string | null;
}

export type ApprovalReferenceDetail =
  | LeaveRequest
  | OvertimeRecord
  | AttendanceCorrection
  | ResignRequest
  | Record<string, any>
  | null;

export interface ApprovalItem {
  id: string;
  module_name: string;
  reference_id: string;
  reference_type: string;
  current_level: number;
  max_level: number;
  status: string;
  created_at: string | null;
  requested_at: string;
  requester?: RequesterInfo | null;
  approver?: RequesterInfo | null;
  reference_detail?: ApprovalReferenceDetail;
  approval_request_id?: string;
  action?: 'APPROVE' | 'REJECT' | 'PENDING' | string;
  comment?: string | null;
  approved_at?: string | null;
  level_order?: number;
  
  // Normalized/Transformed fields
  module?: string;
  request_id?: string;
  employee_name?: string;
  requester_name?: string;
  approver_name?: string;
  description?: string;
  histories?: {
    id: string;
    approver_id: string;
    level_order: number;
    action: string;
    comment: string | null;
    approved_at: string;
    approver?: RequesterInfo | null;
  }[];
}

export interface ApprovalRequestDetail {
  id: string;
  module_name: string;
  reference_id: string;
  reference_type: string;
  requester_id: string;
  current_level: number;
  max_level: number;
  status: string;
  created_at: string;
  requester?: RequesterInfo | null;
  histories?: {
    id: string;
    approver_id: string;
    level_order: number;
    action: string;
    comment: string | null;
    approved_at: string;
    approver?: RequesterInfo | null;
  }[];
  reference_detail?: ApprovalReferenceDetail;
}

export interface ApprovalFeedback {
  id: string;
  action: 'APPROVE' | 'REJECT' | string;
  feedback?: string | null;
  hr_id: string;
  hr_name?: string | null;
  created_at: string;
}

export const getApprovalReferenceDetail = (item: ApprovalItem | ApprovalRequestDetail): ApprovalReferenceDetail =>
  item.reference_detail ?? null;

export const getLeaveApprovalDetail = (item: ApprovalItem | ApprovalRequestDetail): LeaveRequest | null =>
  String(item.module_name || '').toUpperCase() === 'LEAVE'
    ? (getApprovalReferenceDetail(item) as LeaveRequest | null)
    : null;

export const getOvertimeApprovalDetail = (item: ApprovalItem | ApprovalRequestDetail): OvertimeRecord | null =>
  String(item.module_name || '').toUpperCase() === 'OVERTIME'
    ? (getApprovalReferenceDetail(item) as OvertimeRecord | null)
    : null;

export const getCorrectionApprovalDetail = (item: ApprovalItem | ApprovalRequestDetail): AttendanceCorrection | null =>
  String(item.module_name || '').toUpperCase() === 'ATTENDANCE_CORRECTION'
    ? (getApprovalReferenceDetail(item) as AttendanceCorrection | null)
    : null;

export const getResignApprovalDetail = (item: ApprovalItem | ApprovalRequestDetail): ResignRequest | null =>
  String(item.module_name || '').toUpperCase() === 'RESIGN'
    ? (getApprovalReferenceDetail(item) as ResignRequest | null)
    : null;
