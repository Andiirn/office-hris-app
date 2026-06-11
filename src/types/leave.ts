export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: string;
  name: string;
  code?: string;
  category?: string;
  company_id?: string;
  requires_document?: boolean;
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
  leave_type_id: string;
  leave_type_name?: string;
  start_date: string;
  end_date: string | null;
  reason: string;
  status: LeaveStatus;
  created_at: string;
}

export interface CreateLeaveRequest {
  leave_type_id: string;
  start_date: string;
  end_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
  reason: string;
  document_url?: string | null;
}

export interface LeaveHistoryQuery {
  employee_id?: string;
  status?: LeaveStatus;
  page?: number;
  limit?: number;
}
