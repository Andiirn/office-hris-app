Instruksi Implementasi: Fitur "Riwayat Visit Bawahan" di Expo
Konteks Fitur: Saat ini aplikasi mobile sudah memiliki fitur pengajuan Visit (Kunjungan Luar Kantor) dan Riwayat Visit Pribadi. Tugas Anda adalah menambahkan fitur/tab baru bernama "Riwayat Bawahan" yang HANYA muncul jika pengguna yang login memiliki role sebagai atasan (contoh: MANAGER, HEAD_DIVISION, DIRECTOR).

Fitur ini murni untuk Pemantauan (Monitoring). Persetujuan (Approval) dilakukan di modul terpisah, jadi di sini cukup tampilkan daftar riwayat beserta detail/foto kunjungannya.

1. Endpoints & Mekanisme API
Anda akan menggunakan 1 endpoint utama yang sama dengan yang digunakan untuk riwayat pribadi, yaitu: GET /api/v1/attendance/visit

Cara Kerjanya (Backend Scope Authentication):

Backend HRIS telah dirancang sedemikian rupa sehingga jika token yang dikirim adalah milik seorang Manajer, backend akan otomatis me-return data bawahan yang berada di bawah wewenangnya (jika parameter employee_id dikosongkan).
Untuk membedakan mana My Visits dan mana Team Visits, gunakan parameter employee_id di frontend:
Fitur	API Endpoint	Query Params	Perilaku
Riwayat Saya	GET /api/v1/attendance/visit	?employee_id={my_user_id}	Hanya mengembalikan daftar visit milik pengguna sendiri.
Riwayat Bawahan	GET /api/v1/attendance/visit	(Kosongkan parameter employee_id)	Backend membaca token Manajer dan otomatis me-return seluruh visit karyawan di cabangnya.
(Opsional tapi disarankan): Pada saat fetching "Riwayat Bawahan", lakukan filter ringan di frontend (misalnya: data.filter(v => v.employee_id !== my_user_id)) untuk memastikan visit milik atasan itu sendiri tidak ikut ter-render di tabel/list bawahan.

2. Pengecekan Akses Atasan (Role Based)
Pastikan tab/tombol "Riwayat Bawahan" HANYA di-render jika role pengguna memenuhi syarat.

Ambil data user dari global state (Zustand) atau SecureStore.
Lakukan pengecekan role:
typescript

const isManager = ["MANAGER", "MANAGER_HR_ADMIN", "MANAGER_HR_PAYROLL", "HEAD_DIVISION", "CEO", "DIRECTOR"]
    .includes((user?.role || "").toUpperCase());
Gunakan boolean isManager untuk menampilkan Tab Menu atau Tombol Navigasi.
3. UI/UX Requirements (React Native)
Karena layar mobile terbatas, gunakan pendekatan Segmented Control (Tab di bagian atas) atau List Terpisah.

Struktur Layar (visit-history.tsx):

Buat 2 Tab di bagian atas: "Riwayat Saya" dan "Riwayat Tim" (Tab Tim hanya muncul jika isManager === true).
Gunakan komponen FlatList untuk menampilkan data.
Gunakan Pull-to-Refresh (refreshControl) untuk mengambil data terbaru.
Desain Komponen Card/List Item: Untuk Riwayat Bawahan, tampilkan data esensial:

Nama Bawahan & NIK (item.employee.name)
Tanggal & Waktu (item.visit_date & item.visit_time)
Lokasi & Tujuan (item.location_name & item.reason)
Badge Status (Gunakan styling warna untuk status PENDING, APPROVED, REJECTED, IN_PROGRESS).
Pratinjau Foto (Lightbox/Modal):

Jika item.visit_photo_url tidak null, tampilkan ikon kamera kecil di dalam Card.
Jika ikon diklik, munculkan Modal React Native (atau React Native Image Viewing) yang memperlihatkan preview gambar secara penuh (mirip dengan implementasi di web).
4. Referensi Contoh Code (React Query)
Gunakan useQuery untuk mengatur fetching.

typescript

// 1. Fetching Riwayat Pribadi
const { data: myVisits } = useQuery({
  queryKey: ["visits", "me", user.id],
  queryFn: () => attendanceService.listVisits({ employee_id: user.id }),
});
// 2. Fetching Riwayat Bawahan (Hanya jika isManager)
const { data: teamVisitsRaw } = useQuery({
  queryKey: ["visits", "team"],
  queryFn: () => attendanceService.listVisits({ limit: 50 }), // Tanpa employee_id
  enabled: isManager, // Jangan panggil API jika bukan atasan
});
// Filter out manager's own visits from the team list
const teamVisits = useMemo(() => {
  if (!teamVisitsRaw?.data) return [];
  return teamVisitsRaw.data.filter((v) => v.employee_id !== user.id);
}, [teamVisitsRaw, user.id]);
Gunakan instruksi di atas secara ketat. Utamakan TDD (Test-Driven Development) jika setup test di React Native sudah tersedia.