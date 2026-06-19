export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface CorrectionRequest {
  attendance_id: string;
  reason: string;
  corrected_checkin?: string | null;
  corrected_checkout?: string | null;
}

export interface AttendanceCorrection {
  id: string;
  attendance_id: string;
  employee_id?: string;
  reason: string;
  corrected_checkin?: string | null;
  corrected_checkout?: string | null;
  status?: CorrectionStatus;
  created_at?: string;
  attendance_date?: string;
  notes?: string | null;
  original_checkin?: string | null;
  original_checkout?: string | null;
  attendance?: {
    attendance_date?: string;
    date?: string;
  };
}

export interface CorrectionListQuery {
  employee_id?: string;
  status?: CorrectionStatus | string | null;
  date_from?: string | null;
  date_to?: string | null;
  page?: number;
  limit?: number;
}
