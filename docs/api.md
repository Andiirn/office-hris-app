# Employee OpenAPI Mapping (Expo Implementation Guide)

Dokumen ini adalah turunan praktis dari `employee.md`, berorientasi implementasi mobile (Expo + TypeScript).
  - Project Expo ini sudah punya design.md.
  - Semua implementasi UI/UX wajib menjadikan design.md sebagai referensi utama.
  - Jika ada konflik antara employee-implementation.md dan design.md, untuk
    visual/layout/komponen prioritaskan design.md, sedangkan contract API tetap
    mengacu employee-openapi-mapping.md.

## 1) Screen-to-Endpoint Map

### Auth
- `LoginScreen`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/profile`
- `SessionRefresh` (background)
  - `POST /api/v1/auth/refresh`
- `LogoutAction`
  - `POST /api/v1/auth/logout`

### Dashboard
- `EmployeeDashboardScreen`
  - `GET /api/v1/dashboard/stats`
  - (opsional komposisi) leave/overtime/payroll summaries

### Attendance
- `AttendanceListScreen`
  - `GET /api/v1/attendance/`
- `AttendanceDetailScreen`
  - `GET /api/v1/attendance/{id}`
- `AttendanceScanScreen`
  - `POST /api/v1/attendance/checkin`
  - `POST /api/v1/attendance/checkout`
- `AttendanceCorrectionScreen`
  - `POST /api/v1/attendance/corrections`
- `AttendanceVisitRequestScreen`
  - `POST /api/v1/attendance/visit`

### Leave (Izin & Cuti)
- `LeaveHubScreen`
  - `GET /api/v1/leave/balances/{employee_id}`
  - `GET /api/v1/leave/requests`
- `LeaveRequestCreateScreen`
  - `POST /api/v1/leave/requests`
- `LeaveRequestDetailScreen`
  - `GET /api/v1/leave/requests/{id}`
  - `POST /api/v1/leave/requests/{id}/upload-document`
  - `POST /api/v1/leave/requests/{id}/cancel`

### Overtime
- `OvertimeHubScreen`
  - `GET /api/v1/overtime/summary/{employee_id}`
  - `GET /api/v1/overtime/records`
- `OvertimeCreateScreen`
  - `POST /api/v1/overtime/records`
- `OvertimeDetailScreen`
  - `GET /api/v1/overtime/records/{record_id}`

### Payroll
- `PayrollScreen`
  - `GET /api/v1/payroll/preview/{employee_id}`
- `PayrollSlipDownloadAction`
  - `GET /api/v1/payroll/preview/{employee_id}/pdf`

### Notifications
- `NotificationListScreen`
  - `GET /api/v1/notifications/`
- `NotificationActions`
  - `POST /api/v1/notifications/{id}/read`
  - `POST /api/v1/notifications/read-all`

### Resign (Employee Dedicated)
- `ResignHubScreen`
  - `POST /api/v1/resign/requests`
  - `GET /api/v1/resign/requests/my`
  - `GET /api/v1/resign/requests/{id}`
  - `DELETE /api/v1/resign/requests/{id}`

### Profile
- `ProfileScreen`
  - `GET /api/v1/profile`
  - `PUT /api/v1/profile`
  - `PATCH /api/v1/profile/password`
  - `POST /api/v1/profile/avatar`

---

## 2) Role Boundary (Important)

Employee app **MUST NOT** call:
- `GET /api/v1/resign/requests` (HR/Admin)
- `POST /api/v1/resign/requests/{id}/approve` (HR/Admin)

---

## 3) Shared Envelope Types

```ts
export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
  errors?: Array<{ field?: string; message?: string }>;
}

export interface PaginatedMeta {
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
}

export interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> {
  meta?: PaginatedMeta;
}
```

Normalization helper:
```ts
export function unwrapData<T>(raw: unknown): T {
  const node = raw as { data?: unknown };
  if (node && typeof node === "object" && node.data !== undefined) {
    return node.data as T;
  }
  return raw as T;
}
```

---

## 4) TypeScript Contracts per Module

## 4.1 Auth

```ts
export interface LoginRequest {
  nik: string;
  password: string;
  device_fingerprint: string;
  device_name?: string;
  device_os?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface RefreshRequest {
  refresh_token: string;
}
```

## 4.2 Profile

```ts
export interface EmployeeProfile {
  id: string;
  nik: string;
  full_name?: string;
  name?: string;
  email?: string | null;
  role?: string;
  division_id?: string | null;
  position_id?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface UpdateProfileRequest {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  address_domicile?: string | null;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
```

## 4.3 Attendance

```ts
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
}

export interface CheckoutRequest {
  gps_lat: number;
  gps_long: number;
}

export interface AttendanceItem {
  id: string;
  employee_id?: string;
  checkin_time?: string | null;
  checkout_time?: string | null;
  status?: string;
  date?: string;
}

export interface AttendanceListQuery {
  employee_id?: string;
  date_from: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceCorrectionRequest {
  attendance_id: string;
  reason: string;
  corrected_checkin?: string | null;
  corrected_checkout?: string | null;
}

export interface AttendanceVisitRequest {
  date: string;
  checkin_time?: string;
  checkout_time?: string;
  reason: string;
  location?: string;
}
```

## 4.4 Leave

```ts
export interface LeaveBalance {
  id?: string;
  leave_type_id?: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

export interface LeaveRequestItem {
  id: string;
  leave_type_id: string;
  start_date: string;
  end_date?: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
}

export interface CreateLeaveRequest {
  leave_type_id: string;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  reason: string;
  document_url?: string | null;
}
```

## 4.5 Overtime

```ts
export interface OvertimeSummary {
  total_hours?: number;
  total_amount?: number;
  pending_count?: number;
}

export interface OvertimeRecord {
  id: string;
  employee_id?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  status?: string;
}

export interface OvertimeListQuery {
  employee_id?: string;
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}

export interface CreateOvertimeRequest {
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
}
```

## 4.6 Payroll

```ts
export interface PayrollPreview {
  employee_id: string;
  month: number;
  year: number;
  basic_salary?: number;
  allowance?: number;
  deduction?: number;
  take_home_pay?: number;
}

export interface PayrollPreviewQuery {
  month: number;
  year: number;
}
```

## 4.7 Notifications

```ts
export interface NotificationItem {
  id: string;
  title?: string;
  message?: string;
  is_read?: boolean;
  created_at?: string;
  type?: string;
}

export interface NotificationListQuery {
  page?: number;
  limit?: number;
}
```

## 4.8 Resign (Employee)

```ts
export interface SubmitResignRequest {
  reason: string;
  resign_date: string; // YYYY-MM-DD
}

export interface ResignRequestItem {
  id: string;
  employee_id?: string;
  reason?: string;
  resign_date?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  created_at?: string;
}
```

---

## 5) Query Key Suggestion (React Query Mobile)

```ts
export const qk = {
  profile: ["profile"],
  dashboard: ["dashboard", "employee"],

  attendanceList: (q: Record<string, unknown>) => ["attendance", "list", q],
  attendanceDetail: (id: string) => ["attendance", "detail", id],

  leaveBalances: (employeeId: string, year: number) => ["leave", "balances", employeeId, year],
  leaveRequests: (q: Record<string, unknown>) => ["leave", "requests", q],
  leaveDetail: (id: string) => ["leave", "detail", id],

  overtimeSummary: (employeeId: string, month: number, year: number) => ["overtime", "summary", employeeId, month, year],
  overtimeList: (q: Record<string, unknown>) => ["overtime", "list", q],
  overtimeDetail: (id: string) => ["overtime", "detail", id],

  payrollPreview: (employeeId: string, month: number, year: number) => ["payroll", "preview", employeeId, month, year],

  notifications: (q: Record<string, unknown>) => ["notifications", q],

  resignMy: (q: Record<string, unknown>) => ["resign", "my", q],
  resignDetail: (id: string) => ["resign", "detail", id],
};
```

---

## 6) Mobile UX Validation Rules (Recommended)

- Resign submit:
  - `reason` wajib, min 5 chars.
  - `resign_date` wajib, format `YYYY-MM-DD`.
- Cancel resign:
  - hanya aktif saat status `PENDING`.
- Leave cancel:
  - disable jika status bukan `PENDING`.
- Attendance correction:
  - wajib `attendance_id` + `reason`.

---

## 7) Error Handling Contract (Recommended)

Jika API return:
```json
{ "success": false, "message": "...", "errors": [] }
```
Maka mobile app harus:
1. Tampilkan `message` sebagai toast/alert utama.
2. Jika ada `errors[]`, tampilkan per-field jika relevan.
3. Untuk 401, force logout + redirect Login.

---

## 8) Minimal API Client Skeleton (Expo)

```ts
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = "<get-from-secure-store>";
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    if (err?.response?.status === 401) {
      // logout flow
    }
    return Promise.reject(err);
  }
);
```

---

## 9) Final Scope for Employee App (Current)

Wajib tersedia di versi awal Expo:
- Login + refresh + logout
- Dashboard ringkas
- Attendance list/detail + checkin/checkout + correction
- Leave list + create + cancel
- Overtime list + create + detail
- Payroll preview + slip pdf download/open
- Notification list/read
- Resign full employee flow (`submit`, `listMy`, `detail`, `cancel`)
- Profile update + change password

