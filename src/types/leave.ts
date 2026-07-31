export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: string;
  name: string;
  code?: string;
  category?: string;
  company_id?: string;
  requires_document?: boolean;
  optional_document?: boolean;
  max_days_per_year?: number | null;
  description?: string;
  is_active: boolean;
}

export interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee?: {
    id?: string;
    full_name?: string | null;
    nik?: string | null;
    photo_url?: string | null;
  } | null;
  leave_type_id: string;
  leave_type?: {
    id?: string;
    name?: string | null;
    code?: string | null;
    category?: string | null;
  } | null;
  leave_type_name?: string;
  start_date: string;
  end_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
  total_days?: number;
  reason: string;
  status: LeaveStatus;
  document_url?: string | null;
  created_at: string;
  current_approval_level?: number;
  replacement_id?: string | null;
  replacement?: {
    id?: string;
    full_name?: string | null;
    nik?: string | null;
    photo_url?: string | null;
  } | null;
}

export interface CreateLeaveRequest {
  leave_type_id: string;
  start_date: string;
  end_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
  reason: string;
  document_url?: string | null;
  replacement_id?: string | null;
}

export interface LeaveHistoryQuery {
  employee_id?: string;
  status?: LeaveStatus;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
}
