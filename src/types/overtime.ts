export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type OvertimeType = 'REGULAR' | 'HOLIDAY' | 'OFF_DAY';

export interface OvertimeRecord {
  id: string;
  attendance_id: string;
  employee_id: string;
  overtime_date?: string;
  overtime_minutes: number;
  overtime_hours?: number;
  overtime_type: OvertimeType;
  hourly_rate?: number;
  overtime_amount?: number;
  is_approved?: boolean;
  approved_by?: string;
  approved_at?: string;
  status: OvertimeStatus;
  reason?: string;
  created_at: string;
  attendance_date?: string;
}

export interface OvertimeSummary {
  total_minutes: number;
  total_hours: number;
  total_amount?: number;
  pending_minutes: number;
  approved_minutes: number;
  rejected_minutes: number;
}

export interface CreateOvertimeRequest {
  attendance_id: string | null;
  overtime_date: string;
  start_time: string;
  end_time: string;
  overtime_type: OvertimeType;
  reason?: string;
}

export interface OvertimeHistoryQuery {
  employee_id?: string;
  month?: number;
  year?: number;
  status?: OvertimeStatus;
  page?: number;
  limit?: number;
}
