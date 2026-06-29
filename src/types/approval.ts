export interface RequesterInfo {
  id: string;
  full_name: string;
  nik: string;
  photo_url?: string | null;
}

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
  reference_detail?: Record<string, any> | null;
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
  reference_detail?: Record<string, any> | null;
}
