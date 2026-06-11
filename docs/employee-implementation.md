# Employee App Implementation Plan (Expo)

Dokumen ini menjelaskan implementasi aplikasi mobile **Employee** berbasis Expo, menggunakan kontrak endpoint pada:
- `employee.md`
- `employee-openapi-mapping.md`

## 1. Objective

Membangun aplikasi mobile employee dengan cakupan:
- Auth + session management
- Dashboard employee
- Attendance (scan/checkin-checkout, history, correction)
- Leave (request, history, cancel)
- Overtime (request, history, detail)
- Payroll preview + slip
- Notifications
- Resign flow (submit, history, detail, cancel)
- Profile update/password/avatar

## 2. Recommended Stack

- Expo SDK latest stable
- React Native + TypeScript
- React Navigation
- TanStack Query (React Query)
- Axios
- Zustand (UI state ringan)
- React Hook Form + Zod (form validation)
- Expo SecureStore (token storage)
- expo-file-system + expo-sharing (download/share slip)
- expo-notifications (opsional push)
- expo location

## 3. Project Structure

```txt
src/
  app/
    navigation/
      root-navigator.tsx
      auth-stack.tsx
      employee-tabs.tsx
    screens/
      auth/
        login.screen.tsx
      dashboard/
        dashboard.screen.tsx
      attendance/
        attendance-list.screen.tsx
        attendance-detail.screen.tsx
        attendance-scan.screen.tsx
        attendance-correction.screen.tsx
      leave/
        leave-hub.screen.tsx
        leave-request.screen.tsx
        leave-detail.screen.tsx
      overtime/
        overtime-hub.screen.tsx
        overtime-create.screen.tsx
        overtime-detail.screen.tsx
      payroll/
        payroll.screen.tsx
      notifications/
        notifications.screen.tsx
      resign/
        resign-hub.screen.tsx
      profile/
        profile.screen.tsx
        profile-password.screen.tsx
    components/
      common/
      forms/
      cards/
      lists/
  core/
    api/
      client.ts
      interceptors.ts
      envelope.ts
    auth/
      token-store.ts
      session-manager.ts
    query/
      query-client.ts
      query-keys.ts
  services/
    auth.service.ts
    profile.service.ts
    attendance.service.ts
    leave.service.ts
    overtime.service.ts
    payroll.service.ts
    notification.service.ts
    resign.service.ts
  types/
    api/
      common.ts
      auth.ts
      profile.ts
      attendance.ts
      leave.ts
      overtime.ts
      payroll.ts
      notification.ts
      resign.ts
  features/
    auth/
    dashboard/
    attendance/
    leave/
    overtime/
    payroll/
    resign/
    profile/
  stores/
    ui.store.ts
```

## 4. Environment Setup

Gunakan env Expo:

```env
EXPO_PUBLIC_API_URL=https://hris.javasuperfood.com
EXPO_PUBLIC_APP_ENV=production
```

Catatan:
- Gunakan `https` only.
- Jangan hardcode URL di service.

## 5. API Layer Rules

## 5.1 Axios Client
- Base URL dari `EXPO_PUBLIC_API_URL`
- Default `Content-Type: application/json`
- Request interceptor inject access token
- Response interceptor handle 401 -> trigger logout

## 5.2 Envelope Normalization
Semua service harus memanggil helper `unwrapData` agar tahan terhadap shape:
- `{ data: ... }`
- `{ success, data, meta }`
- direct payload

## 5.3 Service Responsibility
- `services/*.service.ts` hanya HTTP contract + parsing.
- Screen tidak boleh parse response mentah.

## 6. Auth & Session Flow

## 6.1 Login
1. User input `nik` + `password`
2. `POST /auth/login`
3. Simpan `access_token` + `refresh_token` di SecureStore
4. `GET /profile` untuk role guard
5. Jika role employee -> masuk Employee App

## 6.2 Token Refresh
- Jika 401 dari API:
  1. Coba `POST /auth/refresh`
  2. Jika sukses, retry request asli
  3. Jika gagal, clear session dan kembali ke login

## 6.3 Logout
- `POST /auth/logout`
- Clear secure storage
- Reset navigation ke auth stack

## 7. Feature Implementation Order (Sprint-Friendly)

## Phase 1 (Core)
1. Auth login/logout/refresh
2. Profile read
3. Basic shell navigation + protected routes

## Phase 2 (Daily Use)
4. Attendance list/detail
5. Checkin/checkout (scan)
6. Leave hub + create + cancel

## Phase 3 (Operations)
7. Overtime hub/create/detail
8. Payroll preview + download slip
9. Notifications list/read

## Phase 4 (HR Workflow for Employee)
10. Resign hub (`submit`, `listMy`, `detail`, `cancel`)
11. Profile edit + password + avatar

## 8. Screen Contract Notes

## 8.1 ResignHubScreen (Employee)
Wajib support:
- Submit resign (`POST /resign/requests`)
- List my requests (`GET /resign/requests/my`)
- Detail request (`GET /resign/requests/{id}`)
- Cancel request (`DELETE /resign/requests/{id}`) hanya jika status `PENDING`

## 8.2 AttendanceScanScreen
- Harus kirim device metadata minimal:
  - `device_fingerprint`
  - `device_os`
  - `device_name`
- Pastikan GPS permission + fallback error UI jelas

## 8.3 PayrollScreen
- Preview by `month/year`
- Untuk PDF, simpan sementara file lalu open/share

## 9. Validation Standards

- Semua form pakai Zod schema.
- Minimal rules:
  - Login: nik/password required
  - Resign: reason min 5 char, resign_date required
  - Leave request: leave_type_id, start_date, reason required
  - Attendance correction: attendance_id, reason required

## 10. Error Handling Standard

## 10.1 User-facing
- `message` API tampil sebagai toast/inline error.
- Jika network timeout: tampilkan retry CTA.

## 10.2 Technical
- Log error ke monitoring (Sentry/Crashlytics opsional).
- Jangan expose stack trace ke user.

## 11. Offline & Performance Notes

- Cache query penting (`staleTime`) untuk list data.
- Gunakan pagination/infinite list pada history panjang.
- Tampilkan skeleton loading, bukan spinner-only.
- Disable duplicate submit saat mutation pending.

## 12. Security Notes

- Token hanya di SecureStore, bukan AsyncStorage plain.
- Jangan simpan password.
- Pastikan base URL `https`.
- Hindari logging payload sensitif di production.

## 13. QA Checklist

## Auth
- Login success/fail
- Auto refresh token
- Auto logout saat refresh gagal

## Attendance
- Checkin success
- Checkout success
- History load + detail load
- Correction submit

## Leave
- Create request
- Cancel pending request
- History consistent

## Overtime
- Create record
- List/filter detail

## Payroll
- Preview by period
- PDF open/share

## Notifications
- List
- Mark read
- Mark all read

## Resign
- Submit request
- History listMy
- Detail by id
- Cancel pending only

## Profile
- Update profile
- Change password
- Upload avatar

## 14. Delivery Artifacts

Saat implementasi selesai, minimum deliverables:
1. Expo app source (employee scope)
2. `.env.example`
3. API service layer + typed contracts
4. README run instructions
5. QA checklist result

## 15. Out of Scope (Current)

- Admin/HR features
- Resign approval flow (admin)
- Company-level master data management

## 16. Important Notes
- always make sure to read design.md, and when user open the scaner show pop up to allow location and get the latitude longitude, and use it for checkin and checkout, if    user not allow location show error and message to allow location for checkin and checkout. 
-  always use superpowers skill for brainstroming and planning, and when generate code always follow the design.md, and follow the rules in this document. 
- make sure all the API calls are following the API contract in the API docs.
- and always make tdd method for any change
- for more details, you have access to outside this folder with the name `hris-fe` in there you can find route for (employee) that i want to use and implementing to this app, but don't make any changes in `hris-fe` folder, use it only for reference to implementing this app. make sure implemented all route in that folder especialy employee route into this app
  
