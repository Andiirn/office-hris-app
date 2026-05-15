# Employee View - Fetched Endpoints

Dokumen ini berisi endpoint yang **benar-benar dipanggil dari Employee View** (`src/app/(employee)` dan `src/components/features/employee`), termasuk login flow yang dipakai user employee.

## Authentication
- `POST /api/v1/auth/login`
  - Dipakai di: `src/components/features/auth/login-form.tsx`

## Profile
- `GET /api/v1/employees/{id}`
  - Dipakai di: `src/components/features/employee/profile/profile-view.tsx`

## Attendance
- `GET /api/v1/attendance/`
  - Dipakai di:
    - `src/components/features/employee/attendance/attendance-hub.tsx`
    - `src/components/features/employee/attendance/attendance-history.tsx`
    - `src/components/features/employee/attendance/correction-form.tsx`
    - `src/components/features/employee/attendance/visit-form.tsx`
    - `src/components/features/employee/overtime/overtime-form.tsx`
- `GET /api/v1/attendance/{id}`
  - Dipakai di: `src/components/features/employee/attendance/attendance-detail.tsx`
- `POST /api/v1/attendance/corrections`
  - Dipakai di:
    - `src/components/features/employee/attendance/correction-form.tsx`
    - `src/components/features/employee/attendance/visit-form.tsx`

## Leave
- `GET /api/v1/leave/types`
  - Dipakai di: `src/components/features/employee/leave/leave-request-form.tsx`
- `POST /api/v1/leave/requests`
  - Dipakai di: `src/components/features/employee/leave/leave-request-form.tsx`
- `GET /api/v1/leave/balances/{employee_id}`
  - Dipakai di:
    - `src/components/features/employee/leave/leave-hub.tsx`
    - `src/components/features/employee/dashboard/employee-sections.tsx`
- `GET /api/v1/leave/requests`
  - Dipakai di: `src/components/features/employee/leave/leave-hub.tsx`
- `POST /api/v1/leave/requests/{id}/cancel`
  - Dipakai di: `src/components/features/employee/leave/leave-hub.tsx`

## Overtime
- `POST /api/v1/overtime/records`
  - Dipakai di: `src/components/features/employee/overtime/overtime-form.tsx`
- `GET /api/v1/overtime/summary/{employee_id}`
  - Dipakai di:
    - `src/components/features/employee/overtime/overtime-view.tsx`
    - `src/components/features/employee/dashboard/employee-sections.tsx`
- `GET /api/v1/overtime/records`
  - Dipakai di: `src/components/features/employee/overtime/overtime-view.tsx`

## Payroll
- `GET /api/v1/payroll/preview/{employee_id}`
  - Dipakai di:
    - `src/components/features/employee/payroll/payroll-view.tsx`
    - `src/components/features/employee/dashboard/employee-sections.tsx`

## Resign
- `GET /api/v1/resign/requests/my`
  - Dipakai di: `src/components/features/employee/resign/resign-hub.tsx`
- `GET /api/v1/resign/requests/{id}`
  - Dipakai di: `src/components/features/employee/resign/resign-hub.tsx`
- `POST /api/v1/resign/requests`
  - Dipakai di: `src/components/features/employee/resign/resign-hub.tsx`
- `DELETE /api/v1/resign/requests/{id}`
  - Dipakai di: `src/components/features/employee/resign/resign-hub.tsx`

## Notifications
- `GET /api/v1/notifications/`
  - Dipakai di:
    - `src/components/features/employee/notifications/notifications-view.tsx`
    - `src/components/features/employee/dashboard/employee-sections.tsx`
- `POST /api/v1/notifications/{id}/read`
  - Dipakai di: `src/components/features/employee/notifications/notifications-view.tsx`
- `POST /api/v1/notifications/read-all`
  - Dipakai di: `src/components/features/employee/notifications/notifications-view.tsx`

---

## Catatan Perbedaan vs Admin View
- Employee View cenderung pakai endpoint berbasis konteks user login (`/my`, `{employee_id}` dari sesi) dan aksi self-service (request/cancel/read).
- Admin View juga memanggil endpoint lain untuk approval, master data, monitoring, dan konfigurasi lintas karyawan/cabang/divisi.
