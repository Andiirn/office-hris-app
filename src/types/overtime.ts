export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface OvertimeRecord {
  id: string;
  attendance_id: string;
  employee_id: string;
  overtime_minutes: number;
  overtime_type: string;
  status: OvertimeStatus;
  reason?: string;
  created_at: string;
  attendance_date?: string;
}

export interface OvertimeSummary {
  total_minutes: number;
  total_hours: number;
  pending_minutes: number;
  approved_minutes: number;
  rejected_minutes: number;
}

export interface CreateOvertimeRequest {
  attendance_id: string;
  overtime_minutes: number;
  overtime_type: string;
  reason: string;
}

export interface OvertimeHistoryQuery {
  employee_id?: string;
  month?: number;
  year?: number;
  status?: OvertimeStatus;
  page?: number;
  limit?: number;
}
