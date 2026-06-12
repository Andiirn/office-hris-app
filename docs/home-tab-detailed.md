# Home Tab - Detailed Feature Map

Dokumen ini merangkum isi tab Home employee app berdasarkan implementasi saat ini di `app/(tabs)/index.tsx` dan menu builder di `src/features/home/home-menu.ts`.

Tujuan dokumen:
- Menjelaskan fitur yang tampil di Home.
- Memetakan menu ke screen yang dibuka.
- Menjelaskan endpoint yang dipakai tab Home.
- Menjadi referensi untuk refactor UI, data flow, dan validasi perilaku.

---

## 1. Ringkasan Tab Home

Tab Home adalah layar utama setelah login employee. Fungsinya:
- Menyapa user dan menampilkan status absensi harian.
- Menyediakan CTA utama untuk scan absensi.
- Menampilkan shortcut menu ke fitur employee.
- Menampilkan feed aktivitas terbaru dari berbagai modul.
- Menampilkan badge persetujuan jika role user bukan `employee`.

Home bukan sekadar dashboard statis. Ia menggabungkan data dari beberapa modul agar user bisa melihat kondisi terakhir tanpa pindah tab.

---

## 2. Komponen UI di Home

### 2.1 Header Sticky

Isi:
- Sapaan `Halo`
- Nama user
- Jabatan / posisi user
- Status absensi hari ini

Perilaku:
- Header tetap menempel di atas.
- Status ditentukan dari data absensi hari ini:
  - `Masuk. Selamat bekerja.`
  - `Keluar. Selamat istirahat.`
  - `Belum absen hari ini.`

Data yang dipakai:
- `user.full_name`
- `user.position_name`
- data absensi terbaru dari `attendanceService.getAttendanceHistory`

### 2.2 CTA Utama Scan QR

Isi:
- Tombol bulat besar `Scan QR Code`
- Subtitle `Tap untuk mulai absensi`

Perilaku:
- Navigasi ke `/attendance-scan`

Tujuan:
- Entry point utama untuk check-in / check-out.

### 2.3 Menu Grid

Isi menu default:
- Izin & Cuti
- Lembur
- Slip Gaji
- Absensi
- Koreksi
- Resign
- Visit

Menu tambahan jika role boleh approve:
- Persetujuan

Perilaku:
- Setiap menu membuka screen terkait.
- Menu persetujuan punya badge jumlah item pending.

### 2.4 Aktivitas Terbaru

Isi:
- Feed gabungan dari:
  - attendance
  - leave
  - overtime
  - resign

Perilaku:
- Hanya menampilkan 8 item terbaru.
- Item bisa di-expand untuk detail.
- Terdapat refresh untuk memuat ulang semua sumber feed.

---

## 3. Menu Home dan Navigasinya

Daftar menu dari `buildHomeMenuItems()`:

| Menu | Route | Fungsi |
|---|---|---|
| Izin & Cuti | `/leave` | Buka hub cuti / izin |
| Lembur | `/overtime` | Buka hub lembur |
| Slip Gaji | `/payroll` | Buka payroll preview |
| Absensi | `/attendance` | Buka ringkasan absensi |
| Koreksi | `/correction` | Buka pengajuan koreksi absensi |
| Resign | `/resign` | Buka hub resign employee |
| Visit | `/visit` | Buka pengajuan visit |
| Persetujuan | `/approvals` | Buka approval list jika role boleh approve |

Catatan:
- Menu `Persetujuan` hanya muncul bila `canApprove(role)` bernilai true.
- Badge persetujuan mengikuti jumlah pending approval.

---

## 4. Endpoint yang Dipakai Home

### 4.1 Attendance Feed

Endpoint:
- `GET /api/v1/attendance/`

Dipakai untuk:
- Status absensi hari ini di header
- Feed check-in / check-out terbaru

Query:
- `employee_id`
- `date_from`
- `date_to`
- `page`
- `limit`

Catatan implementasi:
- Home mengambil 7 hari terakhir.
- Feed menampilkan check-in dan check-out sebagai item terpisah.

### 4.2 Leave Feed

Endpoint:
- `GET /api/v1/leave/requests`

Dipakai untuk:
- Feed aktivitas cuti / izin terbaru
- Komposisi feed aktivitas home

Query:
- `employee_id`
- `limit`

### 4.3 Overtime Feed

Endpoint:
- `GET /api/v1/overtime/records`

Dipakai untuk:
- Feed aktivitas lembur terbaru

Query:
- `employee_id`
- `month`
- `year`
- `page`
- `limit`

Catatan:
- Home memanggil service list records dengan limit kecil untuk ringkasan.

### 4.4 Resign Feed

Endpoint:
- `GET /api/v1/resign/requests/my`

Dipakai untuk:
- Feed aktivitas resign terbaru

Catatan:
- Yang dipakai adalah endpoint employee-owned `my`.
- Jangan gunakan endpoint admin `/api/v1/resign/requests`.

### 4.5 Approval Badge

Endpoint:
- `GET /api/v1/approvals/pending` atau endpoint service internal approval pending yang dipakai `approvalService.getPending()`

Dipakai untuk:
- Badge pada menu `Persetujuan`

Catatan:
- Fitur ini hanya aktif kalau role user dapat approve.
- Home employee biasa tidak harus menampilkan item ini.

---

## 5. Data Flow Home

### 5.1 Header Status Absensi

Sumber data:
- `attendanceFeed[0]`

Aturan yang dipakai sekarang:
- Jika record hari ini punya check-in dan belum check-out:
  - tampilkan status `Masuk. Selamat bekerja.`
- Jika sudah check-out:
  - tampilkan status `Keluar. Selamat istirahat.`
- Jika belum ada record hari ini:
  - tampilkan `Belum absen hari ini.`

### 5.2 Aktivitas Terbaru

Home membangun satu daftar gabungan dari:
- attendance check-in / check-out
- leave request created / approved / rejected / cancelled / document uploaded
- overtime created / approved / rejected / cancelled
- resign created / approved / rejected / cancelled

Sorting:
- urut berdasarkan waktu terbaru
- jika waktu sama, item tertentu diberi prioritas lebih tinggi

UI behavior:
- item bisa di-expand untuk lihat detail
- expand/collapse dikontrol oleh `expandedFeedId`

---

## 6. Bentuk Item Feed

### 6.1 Attendance

Item check-in:
- icon: `login`
- warna: hijau / success
- summary: tanggal + jam masuk

Item check-out:
- icon: `logout`
- warna: merah / danger
- summary: tanggal + jam pulang

### 6.2 Leave

Status yang dibedakan:
- `APPROVED`
- `REJECTED`
- `CANCELLED`
- default `PENDING` / created

Contoh title:
- `Cuti disetujui`
- `Cuti ditolak`
- `Cuti dibatalkan`
- `Pengajuan cuti dibuat`

### 6.3 Overtime

Status yang dibedakan:
- `APPROVED`
- `REJECTED`
- `CANCELLED`
- default `PENDING`

Contoh title:
- `Lembur disetujui`
- `Lembur ditolak`
- `Lembur dibatalkan`
- `Pengajuan lembur dibuat`

### 6.4 Resign

Status yang dibedakan:
- `APPROVED`
- `REJECTED`
- `CANCELLED`
- default `PENDING`

Contoh title:
- `Resign disetujui`
- `Resign ditolak`
- `Resign dibatalkan`
- `Pengajuan resign dibuat`

---

## 7. Loading, Empty, dan Refresh Behavior

### Loading

- Header tidak menunggu semua data selesai untuk muncul.
- Aktivitas terbaru memakai skeleton cards.
- Feed gabungan tetap memberi feedback visual saat fetch berlangsung.

### Empty State

- Jika tidak ada feed:
  - tampilkan `No recent activities`

### Refresh

- Pull to refresh memuat ulang:
  - attendance
  - leave
  - overtime
  - resign

---

## 8. Role-Based Behavior

### Employee biasa

Mendapat:
- menu dasar employee
- feed aktivitas pribadi
- tanpa menu `Persetujuan`

### Role yang bisa approve

Tambahan:
- menu `Persetujuan`
- badge jumlah pending approval

Catatan boundary:
- Home boleh memanggil approval pending hanya jika role mendukung.
- Endpoint admin tetap tidak boleh dipakai oleh employee biasa.

---

## 9. Endpoint Map by UI Element

| UI Element | Endpoint |
|---|---|
| Header status absensi | `GET /api/v1/attendance/` |
| CTA scan QR | `POST /api/v1/attendance/checkin`, `POST /api/v1/attendance/checkout` |
| Menu Izin & Cuti | `GET /api/v1/leave/requests`, `GET /api/v1/leave/balances/{employee_id}` via screen tujuan |
| Menu Lembur | `GET /api/v1/overtime/records`, `GET /api/v1/overtime/summary/{employee_id}` via screen tujuan |
| Menu Slip Gaji | `GET /api/v1/payroll/preview/{employee_id}` via screen tujuan |
| Menu Absensi | `GET /api/v1/attendance/` |
| Menu Koreksi | `GET /api/v1/attendance/`, `POST /api/v1/attendance/corrections` via screen tujuan |
| Menu Resign | `GET /api/v1/resign/requests/my`, `POST /api/v1/resign/requests` via screen tujuan |
| Menu Visit | `POST /api/v1/attendance/visit` via screen tujuan |
| Menu Persetujuan | approval endpoint via approval service internal |
| Feed aktivitas terbaru | attendance, leave, overtime, resign endpoints di atas |

---

## 10. Implementation Notes

- Home screen adalah agregator data, bukan screen form.
- Feed gabungan sekarang masih event-based, bukan daily summary.
- Jika ingin UX yang lebih bersih, kandidat refactor berikutnya:
  - ubah home feed jadi ringkasan per modul, bukan per event mentah
  - pecah CTA / summary / feed menjadi section yang lebih tegas
  - pakai design yang lebih konsisten antara kartu status dan kartu feed

---

## 11. Referensi File

- `app/(tabs)/index.tsx`
- `src/features/home/home-menu.ts`
- `src/services/attendance.service.ts`
- `src/services/leave.service.ts`
- `src/services/overtime.service.ts`
- `src/services/resign.service.ts`
- `src/services/approval.service.ts`
- `docs/employee.md`
- `docs/api.md`

