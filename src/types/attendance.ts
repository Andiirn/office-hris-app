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

export interface AttendanceActionResponse {
  id?: string;
  message?: string;
  status?: string;
}
