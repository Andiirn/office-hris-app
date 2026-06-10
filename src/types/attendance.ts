export interface CheckinRequest {
  qr_token: string;
  branch_id: string;
  gps_lat: number;
  gps_long: number;
  device_fingerprint: string;
  user_agent?: string;
  device_os?: string;
  device_model?: string;
  is_mock_location?: boolean;
  is_rooted?: boolean;
  battery_level?: number | null;
  screen_resolution?: string | null;
  timezone?: string | null;
  device_timezone?: string | null;
  checkin_photo_url?: string | null;
}

export interface CheckoutRequest {
  qr_token?: string;
  gps_lat: number;
  gps_long: number;
  checkout_photo_url?: string | null;
}

export interface AttendanceActionResponse {
  id?: string;
  message?: string;
  status?: string;
}

export interface AttendanceItem {
  id: string;
  employee_id?: string;
  checkin_time?: string | null;
  checkout_time?: string | null;
  status?: string;
  date?: string;
  // API response alias fields
  attendance_date?: string;
  checkin_at?: string | null;
  checkout_at?: string | null;
  attendance_status?: string;
  branch_name?: string | null;
  branch?: {
    id?: string;
    name?: string;
    code?: string;
    timezone?: string;
  } | null;
}

export interface AttendanceListQuery {
  employee_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface VisitRequest {
  gps_lat: number;
  gps_long: number;
  visit_date: string;
  visit_time: string;
  reason: string;
  location_name: string;
  visit_photo_url?: string | null;
}

export interface VisitItem {
  id: string;
  employee_id: string;
  visit_date: string;
  visit_time: string;
  gps_lat: number;
  gps_long: number;
  location_name: string;
  reason: string;
  visit_photo_url?: string | null;
  status: string;
  approved_by?: string | null;
  approved_at?: string | null;
  employee?: {
    id?: string;
    name?: string | null;
    full_name?: string | null;
    nik?: string | null;
  } | null;
  approver?: {
    id?: string;
    name?: string | null;
    full_name?: string | null;
    nik?: string | null;
  } | null;
}

export interface VisitListQuery {
  employee_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

