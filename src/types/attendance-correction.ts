export type AttendanceCorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface AttendanceCorrectionRequest {
  attendance_id: string;
  reason: string;
  corrected_checkin?: string | null;
  corrected_checkout?: string | null;
}

export interface AttendanceCorrectionRecord {
  id: string;
  attendance_id: string;
  employee_id?: string;
  reason: string;
  corrected_checkin?: string | null;
  corrected_checkout?: string | null;
  status?: AttendanceCorrectionStatus;
  created_at?: string;
  attendance_date?: string;
  notes?: string | null;
}
