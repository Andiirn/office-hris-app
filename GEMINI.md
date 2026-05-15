# Project Context: HRIS Mobile App (Employee-First Focus)

> **Strategic Priority:** We are currently focusing EXCLUSIVELY on the **Employee View** building a Mobile App using **Expo (React Native)**.

## 0. Mandatory Workflow & AI Directives
- **Rule:** Always use **Test-Driven Development (TDD)** using React Native Testing Library / Jest. Red-Green-Refactor cycle is strictly enforced.
- **Rule:** **API CONTRACT FIRST!** Always read and verify the `openapi.json` (located in the project root) for exact API schemas, request payloads, and response structures before writing any API calls or types.
- **Rule:** Do NOT modify the backend. Only implement the frontend consuming the provided API contract.
- **Rule:** When the user asks to implement a feature, always check this document for the "Why" and "How" (API Contracts) to understand the context.

## 1. Architectural Patterns
- **API Services:** Domain-Based Services (e.g., `src/lib/api/attendance.service.ts`). Use Axios instance with interceptors for auth.
- **Component Structure:** Feature-Driven Design.
  - `src/components/ui`: Reusable atomic UI components (Button, Input).
  - `src/features/[domain]`: Business logic components specific to employee features (e.g., `src/features/attendance/components/QrScanner.tsx`).


## 2. API Contracts & Employee Features (Why & How)

Berikut adalah hasil analisa menyeluruh dari fitur-fitur Employee View beserta kontrak API yang digunakan. Agen **WAJIB** merujuk pada `openapi.json` untuk detail schema.

### 2.1 Authentication & Profile
- **Why:** Karyawan perlu login untuk mengakses aplikasi, melihat data pribadi, dan mengubah keamanan akun.
- **How (API Contracts):**
  - `POST /api/v1/auth/login`: Autentikasi dan mendapatkan access/refresh token.
  - `POST /api/v1/auth/refresh`: Memperbarui token sesi yang kedaluwarsa.
  - `POST /api/v1/auth/logout`: Keluar dari sesi.
  - `GET /api/v1/profile`: Mengambil data profil karyawan yang sedang login.
  - `PATCH /api/v1/profile/password`: Memperbarui kata sandi pengguna.
  - `POST /api/v1/profile/avatar`: Mengunggah foto profil baru.

### 2.2 Dashboard
- **Why:** Memberikan ringkasan cepat tentang jadwal hari ini, status kehadiran, sisa cuti, dan aksi cepat.
- **How (API Contracts):**
  - Menggabungkan data dari `GET /api/v1/profile`.
  - Mengambil status kehadiran hari ini menggunakan `GET /api/v1/attendance/` (dengan filter rentang waktu hari ini).

### 2.3 Attendance (Absensi)
- **Why:** Fitur inti untuk melacak kehadiran karyawan. Aplikasi mobile menangani pemindaian QR, penandaan lokasi GPS, kunjungan luar kantor, dan koreksi manual.
- **How (API Contracts):**
  - `POST /api/v1/attendance/checkin`: Mengirim data check-in (Payload membutuhkan koordinat lokasi, gambar/foto selfie, dan catatan).
  - `POST /api/v1/attendance/checkout`: Mengirim data check-out (Sama seperti check-in).
  - `POST /api/v1/attendance/visit`: Mencatat kunjungan/tugas di luar kantor (membutuhkan data lokasi GPS).
  - `POST /api/v1/attendance/corrections`: Mengirim permintaan koreksi absen jika lupa absen atau ada kesalahan.
  - `GET /api/v1/attendance/`: Mengambil riwayat kehadiran (mendukung filter dan paginasi).
  - `GET /api/v1/attendance/gps-logs`: Mengambil riwayat log GPS.

### 2.4 Leave (Cuti)
- **Why:** Memungkinkan karyawan untuk melihat sisa kuota cuti dan mengajukan permohonan cuti baru.
- **How (API Contracts):**
  - `GET /api/v1/leave/balances/{employee_id}`: Mengecek sisa kuota cuti karyawan.
  - `GET /api/v1/leave/types`: Mengambil jenis cuti yang tersedia (Sakit, Tahunan, dll).
  - `POST /api/v1/leave/requests`: Mengajukan permohonan cuti (Payload: tipe cuti, tanggal, alasan, file pendukung).
  - `GET /api/v1/leave/requests`: Mengambil riwayat permohonan cuti yang diajukan oleh pengguna.

### 2.5 Overtime (Lembur)
- **Why:** Karyawan mencatat jam kerja tambahan untuk persetujuan manajer dan kompensasi.
- **How (API Contracts):**
  - `POST /api/v1/overtime/records`: Mengajukan klaim lembur.
  - `GET /api/v1/overtime/summary/{employee_id}`: Melihat ringkasan durasi lembur.
  - `GET /api/v1/overtime/records`: Melihat riwayat pengajuan lembur.

### 2.6 Payroll (Slip Gaji)
- **Why:** Karyawan perlu mengakses dan mengunduh slip gaji bulanan mereka secara rahasia.
- **How (API Contracts):**
  - `GET /api/v1/payroll/preview/{employee_id}`: Mengambil detail gaji untuk periode tertentu (mendukung unduhan PDF melalui endpoint terkait jika diperlukan).

### 2.7 Resign (Pengunduran Diri)
- **Why:** Pengajuan resmi pengunduran diri karyawan.
- **How (API Contracts):**
  - `POST /api/v1/resign/requests`: Mengajukan pengunduran diri (Payload: tanggal efektif, alasan).
  - `GET /api/v1/resign/requests/my`: Melihat status pengajuan resign sendiri.

### 2.8 Notifications
- **Why:** Notifikasi in-app untuk pembaruan status persetujuan (cuti, lembur, koreksi absen).
- **How (API Contracts):**
  - `GET /api/v1/notifications/`: Daftar notifikasi pengguna.
  - `POST /api/v1/notifications/{id}/read`: Menandai notifikasi tertentu sudah dibaca.
  - `POST /api/v1/notifications/read-all`: Menandai semua notifikasi sudah dibaca.

## 3. Expo / React Native Specific Instructions
- **Hardware Integration:** Untuk check-in/out absen, agen harus mengimplementasikan API Kamera (Expo Camera untuk selfie/QR) dan Lokasi (Expo Location untuk penandaan koordinat GPS). Payload API Absensi sangat bergantung pada data hardware ini.
- **State Management:** Gunakan Zustand atau React Context untuk mengelola status global seperti status Autentikasi dan data Profil.
- **Auth Flow:** Gunakan Axios interceptors. Jika menerima status 401, gunakan endpoint refresh token. Jika gagal, redirect ke halaman Login.

## 4. TDD & Development Workflow
- **Testing Mandate:** **MANDATORY TDD IMPLEMENTATION.** You are strictly required to follow the Red-Green-Refactor cycle using **Jest** and **React Native Testing Library**.
- **Process:**
  1. **Red:** Write a failing test case that describes the desired functionality (e.g., checking for "Check-in").
  2. **Green:** Write the minimum amount of production code necessary to pass the test.
  3. **Refactor:** Improve the code quality, structure, and performance while ensuring all tests still pass.
- **Test File Location:** Place test files in the `__tests__` directory adjacent to the component or service file.
- remove all test file if the code already perfect and works

## Rules
- fitur attendance checkin dan check out saat ini sudah benar2 berfungsi, tidak perlu di modifikasi. dan juga tidak perlu menambahkan test.
- Hanya kerjakan apa yang di suruh, daan belum exist di current project. dan juga kalau ada file yang tidak bersangkutan dengan fitur yang di suruh, jangan di modifikasi.

