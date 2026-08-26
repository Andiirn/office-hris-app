export type OvertimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type OvertimeType = 'REGULAR' | 'SATURDAY' | 'HOLIDAY';

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
  status?: OvertimeStatus | string;
  reason?: string;
  notes?: string;
  start_time?: string;
  end_time?: string;
  created_at: string;
  attendance_date?: string;
  segments?: OvertimeSegment[];
}

export interface OvertimeSegment {
  id: string;
  segment_date?: string;
  start_time: string;
  end_time: string;
  overtime_minutes: number;
  overtime_hours: number;
  sort_order: number;
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
  start_time?: string;
  end_time?: string;
  overtime_type: OvertimeType | null;
  notes?: string;
  reason?: string;
  segments?: OvertimeSegmentInput[];
}

export interface UpdateOvertimeRequest {
  start_time?: string | null;
  end_time?: string | null;
  overtime_type?: OvertimeType | null;
  notes?: string | null;
  reason?: string | null;
}

export interface OvertimeSegmentInput {
  segment_date: string;
  start_time: string;
  end_time: string;
}

export type AddOvertimeSegmentRequest = OvertimeSegmentInput;

export interface UpdateOvertimeSegmentRequest extends Partial<Omit<OvertimeSegmentInput, 'segment_date'>> {
  segment_date: string;
}

export interface OvertimeHistoryQuery {
  employee_id?: string;
  month?: number;
  year?: number;
  status?: OvertimeStatus;
  page?: number;
  limit?: number;
}
