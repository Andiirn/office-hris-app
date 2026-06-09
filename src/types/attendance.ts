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
  gps_lat: number;
  gps_long: number;
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
