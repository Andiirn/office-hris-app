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
  reference_detail?: Record<string, any> | null;
  
  // Normalized/Transformed fields
  module?: string;
  request_id?: string;
  employee_name?: string;
  description?: string;
}
