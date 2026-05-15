# Employee API Contract (HRIS Absen Frontend)

Dokumen ini merangkum endpoint backend yang **dipakai oleh Employee View** di frontend saat ini, untuk referensi implementasi aplikasi mobile (Expo).

## 1. Base & Auth

- Base URL: `https://<host-hris>`
- Prefix API: `/api/v1`
- Auth: `Authorization: Bearer <access_token>`
- Refresh token flow dipakai dari endpoint auth.

## 2. Auth & Session

### POST `/api/v1/auth/login`
Untuk login employee.

Request (contoh):
```json
{
  "nik": "26059256",
  "password": "******",
  "device_fingerprint": "mobile-device-id",
  "device_name": "Expo App",
  "device_os": "iOS/Android"
}
```

### POST `/api/v1/auth/logout`
Logout session aktif.

### POST `/api/v1/auth/refresh`
Refresh access token.

## 3. Profile (Employee)

### GET `/api/v1/profile`
Ambil profil user login.

### PUT `/api/v1/profile`
Update data profile.

### PATCH `/api/v1/profile/password`
Ganti password.

### POST `/api/v1/profile/avatar`
Upload avatar (`multipart/form-data`, field: `file`).

## 4. Employee Dashboard Data

### GET `/api/v1/dashboard/stats`
Dipakai di dashboard employee/hr hybrid logic.

## 5. Attendance (Employee)

### POST `/api/v1/attendance/checkin`
Request check-in QR/GPS.

Field yang dipakai frontend:
- `qr_token`
- `branch_id`
- `gps_lat`
- `gps_long`
- `device_fingerprint`
- optional: `user_agent`, `device_os`, `device_model`, `is_mock_location`, `is_rooted`, `battery_level`, `screen_resolution`, `timezone`

### POST `/api/v1/attendance/checkout`
Request check-out.

### GET `/api/v1/attendance/`
List attendance history employee.

Query yang biasa dipakai:
- `employee_id`
- `date_from`
- `date_to`
- `page`
- `limit`

### GET `/api/v1/attendance/{id}`
Detail attendance item.

### POST `/api/v1/attendance/corrections`
Ajukan koreksi absensi.

Payload utama:
- `attendance_id`
- `reason`
- optional `corrected_checkin`, `corrected_checkout`

### POST `/api/v1/attendance/visit`
Ajukan attendance visit.

## 6. Leave / Izin / Cuti (Employee)

### GET `/api/v1/leave/balances/{employee_id}`
Ambil saldo cuti employee.

### GET `/api/v1/leave/requests`
List request leave employee.

Query biasa:
- `employee_id`
- `limit`

### POST `/api/v1/leave/requests`
Buat pengajuan leave.

Payload utama:
- `leave_type_id`
- `start_date`
- optional `end_date`
- optional `start_time`, `end_time`
- `reason`
- optional `document_url`

### GET `/api/v1/leave/requests/{id}`
Detail request leave.

### POST `/api/v1/leave/requests/{id}/upload-document`
Upload dokumen leave (`multipart/form-data`, field: `file`).

### POST `/api/v1/leave/requests/{id}/cancel`
Batalkan request leave.

## 7. Overtime (Employee)

### GET `/api/v1/overtime/summary/{employee_id}`
Summary lembur employee.

### GET `/api/v1/overtime/records`
List data lembur employee.

Query umum:
- `employee_id`
- `month`
- `year`
- `page`
- `limit`

### GET `/api/v1/overtime/records/{record_id}`
Detail lembur.

### POST `/api/v1/overtime/records`
Buat pengajuan lembur.

## 8. Payroll (Employee)

### GET `/api/v1/payroll/preview/{employee_id}`
Lihat slip payroll preview employee (by `month`, `year`).

### GET `/api/v1/payroll/preview/{employee_id}/pdf`
Download slip payroll PDF (response `blob`).

## 9. Notifications (Employee)

### GET `/api/v1/notifications/`
List notifikasi.

### POST `/api/v1/notifications/{id}/read`
Mark single notification as read.

### POST `/api/v1/notifications/read-all`
Mark all notifications as read.

## 10. Resign (Employee-Specific Flow)

Endpoint employee yang dipakai:

### POST `/api/v1/resign/requests`
Submit pengajuan resign.

Payload yang dipakai frontend:
```json
{
  "reason": "Pindah domisili",
  "resign_date": "2026-06-30"
}
```

### GET `/api/v1/resign/requests/my`
List history resign milik employee login.

### GET `/api/v1/resign/requests/{id}`
Detail resign request milik employee.

### DELETE `/api/v1/resign/requests/{id}`
Cancel resign request (umumnya saat status masih pending).

## 11. Non-Employee Endpoints (Jangan dipakai di app employee)

Untuk boundary role:
- `GET /api/v1/resign/requests` -> HR/Admin list all
- `POST /api/v1/resign/requests/{id}/approve` -> HR/Admin approval

## 12. Envelope Response Notes

Di frontend sekarang, beberapa endpoint menggunakan envelope:
```json
{
  "success": true,
  "data": ...,
  "meta": ...
}
```

Tapi ada endpoint yang bisa return shape langsung. Untuk mobile disarankan normalisasi parser di API layer:
1. jika `response.data.data` ada -> pakai itu
2. else pakai `response.data`

## 13. Minimum Employee Navigation-to-Endpoint Mapping

- `/dashboard` -> stats + ringkasan employee modules
- `/attendance` -> list attendance
- `/attendance/scan` -> checkin/checkout
- `/attendance/correction` -> submit correction
- `/leave` -> balances + leave history
- `/leave/request` -> create leave
- `/overtime` -> overtime summary + records
- `/payroll` -> payroll preview/pdf
- `/notifications` -> list/read/read-all
- `/resign` -> submit + listMy + detail + cancel
- `/profile` -> get/update profile/password/avatar

---

Jika kamu mau, next saya bisa lanjut buat versi `employee-openapi-mapping.md` yang menautkan setiap endpoint di atas ke screen Expo + TypeScript interface request/response yang siap dipakai di mobile repository.
