# AGENT.md — Employee App (Expo) Execution Guide

Dokumen ini adalah **instruksi operasional** untuk agent (AI atau developer)
yang mengerjakan implementasi **Employee App** berbasis Expo + TypeScript.

Dokumen ini tidak menggantikan dokumen lain — ini adalah **lapisan eksekusi**
di atas dokumen kontrak. Untuk detail isi, agent **harus** membuka dokumen
sumber sesuai konteks.

---

## 0. Reference Index (Sumber Kebenaran)

| Dokumen | Otoritas atas |
|---|---|
| `design.md` | Visual, layout, komponen, warna, tipografi, spacing |
| `employee.md` | Cakupan endpoint employee + base URL + auth flow |
| `employee-openapi-mapping.md` (a.k.a. `api.md`) | Screen ↔ endpoint map, TypeScript contract, query keys |
| `employee-implementation.md` | Stack, struktur proyek, fase implementasi, QA checklist |
| `AGENT.md` (dokumen ini) | Workflow agent, hard rules, done criteria, delivery format |

**Aturan konflik:**
- UI / visual / layout / token → **`design.md` menang**.
- API contract / payload / role access → **`employee-openapi-mapping.md` menang**.
- Stack / struktur folder / fase → **`employee-implementation.md` menang**.
- Workflow eksekusi / done criteria / delivery → **`AGENT.md` menang**.

---

## 1. Mandatory Startup Checklist

Sebelum menulis baris kode pertama, agent **WAJIB**:

1. Baca `design.md` end-to-end. Catat token: `primary` (`#000666`), `surface`
   (`#fbf9f8`), radius default (`0.5rem`), `margin-page` (`1.25rem`), font
   `Manrope` (headlines) & `Inter` (body).
2. Baca `employee.md` untuk daftar endpoint legal employee.
3. Baca `employee-openapi-mapping.md` untuk TypeScript interfaces & query keys.
4. Baca `employee-implementation.md` untuk struktur folder & fase sprint.
5. Verifikasi `.env`:
   ```env
   EXPO_PUBLIC_API_URL=https://hris.javasuperfood.com
   EXPO_PUBLIC_APP_ENV=production
   ```
6. Konfirmasi base URL **HTTPS only**. HTTP ditolak.

Jika salah satu dokumen tidak tersedia di workspace, agent **berhenti** dan
minta dokumen tersebut sebelum mulai.

---

## 2. Scope Guard

Fokus kerja agent **hanya** untuk Employee App. Modul dalam scope:

- Auth (`login`, `refresh`, `logout`) + Session
- Dashboard employee
- Attendance (list, detail, checkin, checkout, correction, visit)
- Leave (balances, list, create, detail, cancel, upload-document)
- Overtime (summary, list, create, detail)
- Payroll (preview, slip PDF)
- Notifications (list, read, read-all)
- Resign (`submit`, `listMy`, `detail`, `cancel`)
- Profile (read, update, password, avatar)

**Out of scope (jangan disentuh):**
- Flow HR / Admin (approval, list-all, master data).
- Perubahan backend / OpenAPI.
- Endpoint admin di app employee (lihat §3).
- Company-level configuration.

---

## 3. API Role Boundary (Hard Rule)

Aturan ini **tidak boleh dilanggar** dalam kondisi apa pun, termasuk untuk
"debug" atau "sementara".

**Employee BOLEH memanggil:**

| Method | Path |
|---|---|
| POST | `/api/v1/resign/requests` |
| GET  | `/api/v1/resign/requests/my` |
| GET  | `/api/v1/resign/requests/{id}` |
| DELETE | `/api/v1/resign/requests/{id}` |

**Employee TIDAK BOLEH memanggil:**

| Method | Path | Owner |
|---|---|---|
| GET  | `/api/v1/resign/requests` | HR / Admin |
| POST | `/api/v1/resign/requests/{id}/approve` | HR / Admin |

Jika agent menemukan kode lama yang memanggil endpoint terlarang → **hapus**
dan flag di delivery notes.

---

## 4. Tech Stack (Fixed)

Stack ini **wajib**. Tidak boleh diganti tanpa persetujuan eksplisit:

- Expo SDK (latest stable)
- React Native + TypeScript (strict mode)
- React Navigation
- TanStack Query (React Query) — server state
- Axios — HTTP client
- Zustand — UI state ringan (tema, drawer, dsb)
- React Hook Form + Zod — form & validation
- `expo-secure-store` — token storage (jangan AsyncStorage untuk token)
- `expo-file-system` + `expo-sharing` — download/share slip
- `expo-location` — GPS untuk attendance
- `expo-camera` / `expo-barcode-scanner` — QR scan
- `expo-notifications` — push (opsional, phase belakangan)

---

## 5. Project Structure (Canonical)

Mengikuti `employee-implementation.md §3`. Ringkasan:

```
src/
  app/navigation/      # root + auth + tabs
  app/screens/<feature>/
  app/components/      # common / forms / cards / lists
  core/api/            # client, interceptors, envelope
  core/auth/           # token-store, session-manager
  core/query/          # query-client, query-keys
  services/            # *.service.ts — HTTP contract + parsing
  types/api/           # interfaces per modul
  features/<feature>/  # hooks, business logic
  stores/              # zustand stores
```

**Larangan struktur:**
- Screen tidak boleh import `axios` langsung — selalu via `services/`.
- Service tidak boleh parse response mentah di screen — selalu pakai
  `unwrapData()` di service.
- Tipe API tidak boleh didefinisikan inline di screen — taruh di `types/api/`.

---

## 6. Implementation Workflow (TDD)

`employee-implementation.md §16` mengamanatkan **TDD untuk setiap perubahan**.
Workflow per fitur:

1. **Analisa** — tentukan screen, endpoint, state, dan edge case.
2. **Type-first** — definisikan request/response interface di `types/api/<feature>.ts`
   sesuai `employee-openapi-mapping.md §4`.
3. **Test-first** — tulis test untuk service & hook sebelum implementasi:
   ```ts
   // services/__tests__/leave.service.test.ts
   it("createLeaveRequest sends correct payload", async () => { ... });
   it("createLeaveRequest unwraps enveloped response", async () => { ... });
   ```
4. **Implement service** — HTTP call + `unwrapData()`.
5. **Implement hook** — React Query `useQuery` / `useMutation` dengan
   `queryKey` dari `core/query/query-keys.ts`.
6. **Implement UI** — mengikuti `design.md` (lihat §7).
7. **Tambah state UI**: loading (skeleton), error (+ retry CTA), empty.
8. **Verifikasi role boundary** (§3) & payload sesuai contract.
9. **Run** `npm run lint`, `npm run typecheck`, `npm test`, build Expo dev.
10. **Update delivery notes** (§13).

---

## 7. UI/UX Rules

Semua keputusan visual mengikuti `design.md`. Token wajib digunakan via
theme provider — **jangan hardcode warna/spacing**.

### 7.1 Color Tokens (dari `design.md`)

| Use case | Token | Hex |
|---|---|---|
| Primary action / active nav | `primary` | `#000666` |
| Primary container | `primary-container` | `#1a237e` |
| Background app | `background` / `surface` | `#fbf9f8` |
| Card surface | `surface-container-lowest` | `#ffffff` |
| Text default | `on-surface` | `#1b1c1c` |
| Text muted | `on-surface-variant` | `#454652` |
| Border / outline | `outline-variant` | `#c6c5d4` |
| Error / late / declined | `error` | `#ba1a1a` |
| Success container | `secondary-container` | `#d9e6da` |

### 7.2 Typography

- Headers (screen title, section title): **Manrope** — `headline-lg` (28/36/800)
  atau `headline-md` (22/28/700).
- Body & data: **Inter** — `body-lg` (16/24) atau `body-md` (14/20).
- Labels / chip text: `label-bold` (12/16/700) atau `label-sm` (11/14/500).

### 7.3 Layout

- Side margin: `margin-page` = **20px**.
- Stack vertical antar card: **16px**.
- Action grid (dashboard shortcut): 2×N, gutter **12px**.
- Card padding internal: **20px**.

### 7.4 Komponen Wajib

Mengikuti `design.md §Components`:

- **Card**: putih, no border, shadow lembut (blur 20px / opacity 4% / Y 4),
  radius **16px**.
- **Floating Action Button**: lingkaran sempurna, `primary` fill, icon putih,
  shadow lebih dalam.
- **Bottom Navigation**: glassmorphism (blur 15–25px, white 80%), active
  state `primary`, inactive neutral gray.
- **Input field**: ghost-style, fill `surface-container-low`, radius 16px,
  border `primary` saat focus.
- **Status chip**: pill, radius 8px, bg low-opacity warna status, text
  high-saturation.

### 7.5 Wajib per Screen

Setiap screen **harus** punya:
- Loading state → **skeleton**, bukan spinner-only.
- Error state → pesan + tombol **Retry**.
- Empty state → ilustrasi/icon + 1 baris penjelas + CTA bila relevan.
- Pull-to-refresh untuk semua list screen.
- Disable duplicate submit saat mutation pending (button → spinner + disabled).

### 7.6 Larangan UI

- Tidak boleh menampilkan raw JSON ke user.
- Tidak boleh `alert()` JavaScript untuk error UX — gunakan toast/inline.
- Tidak boleh hardcode warna hex di JSX.

---

## 8. Data Layer Rules

### 8.1 Envelope Normalization

Backend tidak konsisten. Wajib pakai helper dari `employee-openapi-mapping.md §3`:

```ts
export function unwrapData<T>(raw: unknown): T {
  const node = raw as { data?: unknown };
  if (node && typeof node === "object" && node.data !== undefined) {
    return node.data as T;
  }
  return raw as T;
}
```

Setiap service call:
```ts
const res = await api.get("/leave/balances/" + employeeId);
return unwrapData<LeaveBalance[]>(res);
```

### 8.2 Query Keys

Wajib pakai factory dari `employee-openapi-mapping.md §5`. Contoh:
```ts
useQuery({
  queryKey: qk.leaveBalances(employeeId, year),
  queryFn: () => leaveService.getBalances(employeeId, year),
});
```

Larangan: queryKey inline string (`["leave"]`) — tidak akan match invalidation.

### 8.3 Invalidation Rules

Setelah mutation, invalidate key terkait:
- `createLeaveRequest` → invalidate `qk.leaveRequests(*)` + `qk.leaveBalances(...)`.
- `cancelLeaveRequest` → invalidate `qk.leaveRequests(*)` + `qk.leaveDetail(id)`.
- `checkin` / `checkout` → invalidate `qk.attendanceList(*)` + `qk.dashboard`.
- `submitResign` → invalidate `qk.resignMy(*)`.
- `cancelResign` → invalidate `qk.resignMy(*)` + `qk.resignDetail(id)`.

### 8.4 Stale Time

- List history (attendance, leave, overtime, resign): `staleTime: 60_000`.
- Dashboard stats: `staleTime: 30_000`.
- Profile: `staleTime: 5 * 60_000`.
- Payroll preview: `staleTime: 5 * 60_000`.

### 8.5 Pagination

Gunakan infinite query untuk list history panjang (attendance, notifications).
Trigger `fetchNextPage` saat scroll 80% threshold.

---

## 9. Validation Standards (Zod)

Semua form pakai React Hook Form + Zod. Schema minimal per modul:

### 9.1 Auth
```ts
const loginSchema = z.object({
  nik: z.string().min(1, "NIK wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});
```

### 9.2 Resign
```ts
const resignSchema = z.object({
  reason: z.string().min(5, "Minimal 5 karakter"),
  resign_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD"),
});
```

### 9.3 Leave Request
```ts
const leaveSchema = z.object({
  leave_type_id: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  reason: z.string().min(5),
});
```

### 9.4 Attendance Correction
```ts
const correctionSchema = z.object({
  attendance_id: z.string().min(1),
  reason: z.string().min(5),
  corrected_checkin: z.string().optional().nullable(),
  corrected_checkout: z.string().optional().nullable(),
});
```

### 9.5 Overtime
```ts
const overtimeSchema = z.object({
  employee_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().min(5),
});
```

### 9.6 Change Password
```ts
const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, "Minimal 8 karakter"),
});
```

---

## 10. Error Handling Contract

Bentuk response error dari API:
```json
{ "success": false, "message": "...", "errors": [{"field":"...","message":"..."}] }
```

Behavior wajib:
1. Tampilkan `message` sebagai toast / inline error utama.
2. Jika `errors[]` ada, set per-field error via `form.setError(field, message)`.
3. **401** → trigger refresh token sekali; jika gagal → clear secure store +
   navigate ke `LoginScreen`.
4. **403** → toast "Akses ditolak" — jangan navigate.
5. **422** → tampilkan field errors (mapping ke RHF).
6. **5xx** → toast "Server bermasalah, coba lagi" + retry CTA.
7. **Network timeout / no connection** → toast + retry CTA, jangan crash.

Jangan expose stack trace ke user. Log via Sentry / Crashlytics jika ada.

---

## 11. Auth & Session Flow

Mengikuti `employee-implementation.md §6`:

### 11.1 Login
1. RHF + Zod validate input.
2. `POST /api/v1/auth/login` dengan `device_fingerprint`, `device_name`, `device_os`.
3. Simpan `access_token` & `refresh_token` ke **SecureStore**.
4. `GET /api/v1/profile` → role guard.
5. Jika `role !== employee` → blokir + tampilkan pesan, jangan masuk app.
6. Jika employee → navigate ke `EmployeeTabs`.

### 11.2 Refresh
- Axios response interceptor menangkap 401.
- Panggil `POST /api/v1/auth/refresh` dengan `refresh_token`.
- Jika sukses → retry request original sekali.
- Jika gagal → clear SecureStore + reset navigation ke `AuthStack`.
- **Race protection**: hanya 1 refresh in-flight; request lain antri.

### 11.3 Logout
- `POST /api/v1/auth/logout` (best-effort, jangan blokir UI).
- Clear SecureStore.
- Clear React Query cache (`queryClient.clear()`).
- Reset navigation.

---

## 12. Feature-Specific Notes

### 12.1 AttendanceScanScreen (Location-Critical)

Mengacu `employee-implementation.md §16`:

1. **Saat screen mount**, tampilkan **popup permission** untuk lokasi:
   ```ts
   const { status } = await Location.requestForegroundPermissionsAsync();
   ```
2. Jika `status !== "granted"`:
   - Tampilkan UI error: *"Izinkan akses lokasi untuk melakukan check-in / check-out"*.
   - Sediakan tombol **"Buka Pengaturan"** (`Linking.openSettings()`).
   - **Jangan** lanjut ke scan / submit.
3. Jika granted:
   - `const pos = await Location.getCurrentPositionAsync({ accuracy: High });`
   - Simpan `gps_lat = pos.coords.latitude`, `gps_long = pos.coords.longitude`.
4. Scan QR → dapat `qr_token` + `branch_id`.
5. Kirim ke `POST /api/v1/attendance/checkin` dengan payload lengkap:
   ```ts
   {
     qr_token, branch_id, gps_lat, gps_long,
     device_fingerprint, device_os, device_model,
     is_mock_location, is_rooted, battery_level,
     screen_resolution, timezone
   }
   ```
6. Untuk **checkout**: cukup `gps_lat` + `gps_long`.
7. Deteksi mock location (`is_mock_location: pos.mocked === true`) — kirim apa
   adanya, biar backend yang reject.
8. Loading state: jangan biarkan user submit dua kali — disable tombol +
   tampilkan spinner di tombol.

### 12.2 ResignHubScreen

- Tampilkan list dari `GET /resign/requests/my` (BUKAN `/resign/requests`).
- Tombol **Submit** → `POST /resign/requests` dengan `{ reason, resign_date }`.
- Tombol **Cancel** hanya tampil/aktif kalau `status === "PENDING"`.
- Konfirmasi dengan modal sebelum DELETE.
- Detail screen → `GET /resign/requests/{id}` — pastikan id dari list `my`,
  bukan dari sumber lain.

### 12.3 PayrollScreen

- Preview: `GET /payroll/preview/{employee_id}?month=&year=`.
- Month/year picker default ke bulan berjalan.
- Download PDF:
  ```ts
  const url = `/api/v1/payroll/preview/${employeeId}/pdf?month=${m}&year=${y}`;
  // axios responseType: 'blob' → save via expo-file-system → expo-sharing.shareAsync
  ```
- File temporary name: `slip-{YYYY}-{MM}-{employeeId}.pdf`.

### 12.4 NotificationListScreen

- Infinite scroll.
- Tap item → mark read (`POST /notifications/{id}/read`) + optimistic update.
- Tombol header "Mark all read" → `POST /notifications/read-all` + invalidate.

### 12.5 LeaveRequestDetailScreen

- Tombol **Upload dokumen** muncul jika `document_url` kosong.
  - Pakai `expo-document-picker` → `POST /leave/requests/{id}/upload-document`
    multipart, field `file`.
- Tombol **Cancel** hanya aktif saat `status === "PENDING"`.

### 12.6 ProfileScreen

- Edit profile: `PUT /profile` dengan field opsional sesuai `UpdateProfileRequest`.
- Ganti password: screen terpisah, `PATCH /profile/password`.
- Upload avatar: `POST /profile/avatar` multipart, field `file`. Setelah sukses
  invalidate `qk.profile`.

---

## 13. Delivery Notes Format

Setiap pull request / update dari agent **wajib** mencantumkan:

```markdown
### Delivery — <Feature Name>

**Files changed:**
- src/services/leave.service.ts
- src/features/leave/use-leave-balances.ts
- src/app/screens/leave/leave-hub.screen.tsx
- src/types/api/leave.ts
- tests/services/leave.service.test.ts

**Endpoints used:**
- GET /api/v1/leave/balances/{employee_id}
- GET /api/v1/leave/requests
- POST /api/v1/leave/requests/{id}/cancel

**User flow impact:**
- Employee dapat melihat saldo cuti & list request.
- Cancel hanya aktif saat status PENDING.

**Role boundary check:** ✅ no HR/Admin endpoint used.

**Verification:**
- `npm run typecheck` → pass
- `npm run lint` → pass
- `npm test -- leave` → 8 passed
- Manual: login → /leave → balance render → cancel pending OK
```

---

## 14. Done Criteria per Feature

Fitur dianggap **DONE** hanya jika **semua** terpenuhi:

- [ ] TypeScript contract didefinisikan di `types/api/<feature>.ts`.
- [ ] Service layer pakai `unwrapData()` + query key dari factory.
- [ ] Unit test service & hook ditulis dan **pass** (TDD).
- [ ] Endpoint sesuai contract di `employee-openapi-mapping.md`.
- [ ] Tidak ada panggilan endpoint HR/Admin (§3).
- [ ] UI mengikuti token `design.md` (warna, typografi, spacing, radius).
- [ ] Loading (skeleton) + error (retry) + empty state tersedia.
- [ ] Validation Zod sesuai §9.
- [ ] Error handling sesuai §10 (termasuk 401 → refresh / logout).
- [ ] Disable duplicate submit saat mutation pending.
- [ ] Build Expo dev sukses (`npx expo start` tanpa error).
- [ ] `lint` + `typecheck` + `test` semua pass.
- [ ] Tidak merusak fitur employee lain (smoke test manual modul lain).
- [ ] Delivery notes (§13) ditulis.

---

## 15. Security Hard Rules

- Token **hanya** di `expo-secure-store`. AsyncStorage / plain file = pelanggaran.
- Jangan pernah simpan / log password.
- Base URL **HTTPS only**.
- Jangan log payload sensitif (password, token, body request login/refresh)
  di production. Dev OK, production wrap dengan `if (__DEV__)`.
- Jangan kirim `Authorization` header ke endpoint non-API base URL.
- Selalu gunakan `device_fingerprint` yang stabil per device (Expo
  `Application.androidId` / `getIosIdForVendorAsync()` + fallback UUID
  cached di SecureStore).

---

## 16. Out of Scope (Tegas)

Agent **tidak** mengerjakan:
- Admin / HR features (approval, list-all, master data).
- Resign approval flow.
- Company-level master data management.
- Perubahan backend / OpenAPI.
- Tooling CI/CD (kecuali diminta eksplisit).
- Push notification server-side configuration.

---

## 17. Escalation Rules

Agent **berhenti dan minta klarifikasi** jika:
1. Dokumen referensi (§0) tidak tersedia atau berkonflik tidak terselesaikan.
2. Endpoint yang diminta tidak ada di `employee.md` / `employee-openapi-mapping.md`.
3. Task implisit memerlukan endpoint HR/Admin.
4. Design token yang dibutuhkan tidak ada di `design.md`.
5. Stack / library baru di luar §4 dibutuhkan.

Format eskalasi singkat:
```
BLOCKER: <satu kalimat masalah>
CONTEXT: <dokumen / kode terkait>
OPTIONS: <2-3 pilihan dengan trade-off>
NEED: <keputusan / dokumen yang diminta>
```

---

## 18. Quick Command Reference

```bash
# Dev
npx expo start

# Type check
npm run typecheck   # tsc --noEmit

# Lint
npm run lint

# Test (TDD)
npm test
npm test -- --watch <feature>

# Build dev client
eas build --profile development --platform android
```

---

**End of AGENT.md** — Jika kamu agent yang baca ini: konfirmasi sudah baca
`design.md`, `employee.md`, `employee-openapi-mapping.md`, dan
`employee-implementation.md` sebelum menulis kode pertama.
