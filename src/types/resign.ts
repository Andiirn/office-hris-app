export type ResignStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ResignRequest {
  id: string;
  employee_id: string;
  full_name?: string;
  resign_date: string;
  reason: string;
  handover_notes?: string | null;
  status: ResignStatus;
  created_at: string;
  approved_at?: string | null;
  rejected_at?: string | null;
}

export interface CreateResignRequest {
  resign_date: string;
  reason: string;
  handover_notes?: string | null;
}

export interface ResignHistoryQuery {
  page?: number;
  limit?: number;
}
