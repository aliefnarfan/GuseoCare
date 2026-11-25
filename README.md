# GuseoCare — Hospital Management Information System

**GuseoCare** adalah aplikasi web **Sistem Informasi Manajemen Rumah Sakit (SIMRS)** *full-stack* untuk **RS Pendidikan Universitas Guseo** yang dibangun menggunakan **Next.js (App Router)**, **PostgreSQL**, dan **Tailwind CSS**.

Aplikasi ini mengintegrasikan alur pelayanan rumah sakit secara menyeluruh mulai dari direktori publik dokter & poliklinik, pendaftaran janji temu pasien, konfirmasi & pemeriksaan klinis oleh dokter, penerbitan rekam medis & resep elektronik, pencetakan dokumen PDF, hingga manajemen farmasi, administrasi, serta analitik operasional rumah sakit.

## Fitur Utama

### 1. Portal Publik & Mode Tamu (*Continue as Guest*)

* **Halaman Beranda RS Pendidikan Universitas Guseo** dengan informasi layanan unggulan, unit poliklinik, dan kontak rumah sakit.
* **Direktori Dokter Interaktif** lengkap dengan spesialisasi poliklinik, bio singkat, dan jadwal praktik.
* Akses **"Lanjutkan sebagai Tamu"** langsung dari halaman login tanpa harus mendaftar terlebih dahulu.

### 2. Autentikasi, Otorisasi (RBAC), & Manajemen Profil

* **Role-Based Access Control (RBAC)** melalui `middleware.js` dan sesi cookie terenkripsi untuk 3 peran: **Admin**, **Dokter**, dan **Pasien**.
* Registrasi mandiri untuk pasien baru serta proteksi rute dashboard sesuai peran.
* **Halaman Manajemen Profil (`/profile`)**: setiap pengguna dapat memperbarui nama lengkap, email, bio spesialisasi (khusus dokter), serta mengubah kata sandi secara mandiri.

### 3. Dashboard Pasien (`/dashboard/pasien`)

* **Pendaftaran Janji Temu (Booking)** dengan validasi kecocokan hari praktik dokter, pencegahan bentrok slot, dan ringkasan jadwal *sticky*.
* **Manajemen Jadwal & Status**: filter status (*Aktif* / *Selesai & Batal*), ubah jadwal (*Reschedule*), serta pembatalan mandiri untuk janji yang masih `pending`.
* **Riwayat Rekam Medis & Resep Obat**: melihat hasil diagnosis, tindakan klinis, anjuran dokter, status penyiapan resep farmasi, serta tombol **Cetak / Unduh PDF** berkop resmi rumah sakit.

### 4. Dashboard Dokter (`/dashboard/dokter`)

* **Antrean & Konfirmasi Pasien**: menyetujui (`approved`) atau menolak (`rejected` beserta alasan penolakan) pengajuan janji temu.
* **Pemeriksaan Klinis & E-Prescription**: input diagnosis, tindakan medis, catatan anjuran, dan resep obat dinamis yang otomatis terhubung ke instalasi farmasi.
* **Riwayat Pemeriksaan & Ekspor PDF**: daftar rekam medis pasien yang telah diperiksa beserta fitur **Cetak / Unduh PDF**.
* **Manajemen Jadwal Praktik (`ScheduleManagementTab`)**: CRUD jadwal praktik berdurasi tetap **30 menit** dengan validasi **anti tumpang tindih (*overlap*)** dan proteksi hapus jika jadwal sudah terikat janji temu.

### 5. Dashboard Admin & Instalasi Farmasi (`/dashboard/admin`)

* **Antrean Resep Farmasi**: memproses resep dari `menunggu diproses` → `siap diambil` (otomatis memotong stok gudang dalam transaksi database) → `sudah diambil`, lengkap dengan peringatan jika stok obat kurang.
* **Manajemen Stok Obat (CRUD)**: tambah, edit/restok, hapus obat (dengan proteksi relasi resep), filter status stok (*Tersedia*, *Stok Menipis*, *Stok Habis*), pencarian, dan **sorting** (*Nama A–Z, Z–A, Stok Terendah, Stok Tertinggi*).
* **Verifikasi & Monitoring Janji Temu**: memantau seluruh janji lintas poliklinik serta menyetujui/menolak janji berstatus `pending`.
* **Manajemen Pengguna (CRUD)**: kelola akun Admin, Dokter (termasuk penempatan Poliklinik & Bio), dan Pasien dengan filter peran, filter tanggal daftar, pencarian nama, **sorting nama (A–Z / Z–A)**, serta proteksi hapus pengguna yang memiliki riwayat transaksi.
* **Manajemen Poliklinik (CRUD)**: tambah, ubah, dan hapus unit poliklinik dengan proteksi *foreign key* apabila masih ada dokter terdaftar di poli tersebut.
* **Laporan & Analitik Operasional (`AnalyticsReportTab`)**: ringkasan KPI *real-time*, visualisasi jumlah pasien & kunjungan per poliklinik, statistik penggunaan obat beserta sisa stok, serta tabel kinerja dan tingkat penyelesaian konsultasi per dokter.

### 6. Fitur Opsional (*Advanced Upgrades*) yang Diimplementasikan

* **Laporan & Analitik (Admin)**: laporan jumlah pasien per poliklinik, kinerja dokter, dan statistik penggunaan obat secara *real-time*.
* **Filter & Sorting Nama Pengguna / Dokter** (A–Z, Z–A, Registrasi Terbaru) di Dashboard Admin.
* **Filter & Sorting Nama & Stok Obat** (A–Z, Z–A, Stok Terendah/Tertinggi, Status Stok) di Dashboard Admin.
* **Cetak / Ekspor Rekam Medis & Resep ke PDF** berkop resmi RS Pendidikan Universitas Guseo untuk Pasien dan Dokter.

## Teknologi yang Digunakan

* **Framework:** Next.js (App Router) & React
* **Styling:** Tailwind CSS
* **Database:** PostgreSQL (`pg`)
* **Keamanan & Autentikasi:** `bcryptjs`, JWT (`jose`) / HTTP-Only Session Cookie, Next.js Middleware
* **Ekspor Dokumen:** Native Browser Print-to-PDF Template (`src/lib/printMedicalRecord.js`)

## Struktur Folder Proyek

```text
GuseoCare/
├── database/                               # Skema dan seeding database PostgreSQL
│   ├── schema.sql                          # Skema DDL struktur tabel, relasi, & indeks
│   └── seed.js                             # Skrip seeding data awal & akun demo (bcrypt)
│
├── public/                                 # Aset statis publik
│   ├── doctors/                            # Foto profil dokter (3.jpg - 13.jpg & .gitkeep)
│   ├── guseocare-logo.png                  # Logo dan favicon resmi GuseoCare
│   └── hospital-bg.webp                    # Gambar latar belakang halaman beranda & autentikasi
│
├── src/
│   ├── app/                                # Next.js App Router (Halaman UI & API Routes)
│   │   ├── api/                            # Backend REST API Endpoints
│   │   │   ├── appointments/
│   │   │   │   ├── [id]/route.js           # PATCH ubah jadwal, approve, reject, cancel
│   │   │   │   └── route.js                # GET & POST janji temu
│   │   │   ├── auth/
│   │   │   │   ├── change-password/route.js # PATCH ubah kata sandi pengguna
│   │   │   │   ├── login/route.js          # POST login & set HTTP-only cookie
│   │   │   │   ├── logout/route.js         # POST logout & hapus cookie sesi
│   │   │   │   ├── me/route.js             # GET data sesi pengguna aktif
│   │   │   │   └── register/route.js       # POST registrasi akun pasien baru
│   │   │   ├── doctors/
│   │   │   │   └── route.js                # GET daftar dokter beserta jadwal praktiknya
│   │   │   ├── medical-records/
│   │   │   │   └── route.js                # GET & POST rekam medis beserta resep obat
│   │   │   ├── medicines/
│   │   │   │   ├── [id]/route.js           # PATCH edit/restok & DELETE obat
│   │   │   │   └── route.js                # GET & POST katalog obat farmasi
│   │   │   ├── polis/
│   │   │   │   ├── [id]/route.js           # PATCH edit & DELETE poliklinik
│   │   │   │   └── route.js                # GET & POST unit poliklinik
│   │   │   ├── prescriptions/
│   │   │   │   ├── [id]/route.js           # PATCH proses status resep & potong stok otomatis
│   │   │   │   └── route.js                # GET antrean resep farmasi
│   │   │   ├── profiles/
│   │   │   │   └── route.js                # GET & PATCH informasi profil pengguna aktif
│   │   │   ├── schedules/
│   │   │   │   ├── [id]/route.js           # PATCH edit & DELETE slot jadwal dokter
│   │   │   │   └── route.js                # GET & POST slot jadwal praktik (anti-overlap)
│   │   │   └── users/
│   │   │       ├── [id]/route.js           # PATCH edit & DELETE pengguna (Admin)
│   │   │       └── route.js                # GET & POST manajemen pengguna (Admin)
│   │   │
│   │   ├── dashboard/                      # Halaman portal berdasarkan peran
│   │   │   ├── admin/page.jsx              # Dashboard Admin & Instalasi Farmasi
│   │   │   ├── dokter/page.jsx             # Dashboard Praktik Dokter
│   │   │   └── pasien/page.jsx             # Dashboard Layanan Pasien
│   │   │
│   │   ├── login/page.jsx                  # Halaman Masuk (Login) & Lanjutkan sebagai Tamu
│   │   ├── profile/page.jsx                # Halaman Manajemen Profil & Ubah Kata Sandi
│   │   ├── register/page.jsx               # Halaman Pendaftaran Akun Pasien
│   │   ├── globals.css                     # Konfigurasi CSS global & Tailwind CSS
│   │   ├── layout.js                       # Root layout aplikasi & metadata HTML
│   │   └── page.js                         # Halaman utama (Landing Page GuseoCare)
│   │
│   ├── components/                         # Komponen UI reusable
│   │   ├── admin/
│   │   │   ├── AnalyticsReportTab.jsx      # Tab laporan & analitik operasional (Admin)
│   │   │   ├── PoliManagementTab.jsx       # Tab CRUD manajemen poliklinik (Admin)
│   │   │   └── UserManagementTab.jsx       # Tab CRUD, filter, & sorting pengguna (Admin)
│   │   ├── dokter/
│   │   │   └── ScheduleManagementTab.jsx   # Tab CRUD jadwal praktik dokter
│   │   ├── ConfirmModal.jsx                # Modal konfirmasi penghapusan data
│   │   ├── DoctorCard.jsx                  # Kartu profil dokter dengan foto & fallback inisial
│   │   ├── DoctorDirectory.jsx             # Filter poliklinik & direktori dokter di beranda
│   │   ├── Footer.jsx                      # Footer informasi alamat, navigasi, kontak, & jam besuk
│   │   ├── Navbar.jsx                      # Navigasi atas responsif dengan indikator aktif
│   │   └── StatusBadge.jsx                 # Lencana warna status janji temu & resep farmasi
│   │
│   ├── lib/                                # Utilitas inti aplikasi
│   │   ├── auth.js                         # Helper pembuatan & verifikasi JWT (jose)
│   │   ├── db.js                           # Konfigurasi connection pool PostgreSQL (pg)
│   │   ├── printMedicalRecord.js           # Utilitas cetak / ekspor rekam medis & resep ke PDF
│   │   └── session.js                      # Helper pembacaan sesi pengguna dari cookie
│   │
│   └── middleware.js                       # Proteksi rute otomatis & redirect berbasis peran
│
├── .env.example                            # Template variabel lingkungan (disalin ke .env.local)
├── .gitignore                              # Daftar file/folder yang tidak dilacak Git (.env.local, dll.)
├── eslint.config.mjs                       # Konfigurasi ESLint
├── jsconfig.json                           # Konfigurasi path alias (@/* -> ./src/*)
├── next.config.mjs                         # Konfigurasi Next.js
├── package-lock.json                       # Lockfile versi dependensi NPM
├── package.json                            # Daftar dependensi & skrip NPM
└── README.md                               # Dokumentasi proyek GuseoCare
```

## Ringkasan Skema Database (`database/schema.sql`)

| Tabel | Deskripsi |
| ----- | ----- |
| `users` | Menyimpan akun `admin`, `dokter`, dan `pasien` beserta password ter-hash. |
| `polis` | Daftar unit poliklinik rumah sakit. |
| `doctor_profiles` | Profil tambahan dokter (`poli_id`, `bio`) yang terhubung ke `users` dan `polis` (`ON DELETE RESTRICT`). |
| `schedules` | Slot jadwal praktik dokter berdurasi tetap 30 menit per hari. |
| `appointments` | Data janji temu pasien, keluhan, status (`pending`, `approved`, `done`, `rejected`, `cancelled`), dan alasan penolakan. |
| `medical_records` | Hasil diagnosis medis, tindakan klinis, dan catatan anjuran dokter per janji temu. |
| `medicines` | Katalog obat farmasi (`biasa` / `keras`) beserta jumlah stok gudang. |
| `prescriptions` | Header resep obat yang terhubung ke rekam medis dengan status (`menunggu diproses`, `siap diambil`, `sudah diambil`). |
| `prescription_items` | Rincian item obat dan kuantitas pada setiap resep. |

## Panduan Instalasi & Menjalankan Proyek

### 1. Prasyarat

* **Node.js** v18+
* **PostgreSQL** v14+

### 2. Clone Repository & Install Dependensi

```bash
git clone https://github.com/aliefnarfan/GuseoCare.git
cd GuseoCare
npm install
```

### 3. Konfigurasi Environment Variable

Salin `.env.example` menjadi `.env.local`, lalu sesuaikan kredensial PostgreSQL dan secret key Anda:

```bash
cp .env.example .env.local
```

Contoh isi `.env.local`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/guseocare
JWT_SECRET=rahasia_jwt_yang_panjang_dan_aman
```

### 4. Inisialisasi Database & Seeding Data Awal

Buat database baru di PostgreSQL (misalnya `guseocare`), lalu jalankan skema dan seed:

```bash
psql -U postgres -d guseocare -f database/schema.sql
node database/seed.js
```

### 5. Jalankan Aplikasi (Mode Pengembangan)

```bash
npm run dev
```

Buka browser dan akses **`http://localhost:3000`**.

## Ringkasan Endpoint API

| Modul | Method & Endpoint | Akses |
| ----- | ----- | ----- |
| **Auth** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PATCH /api/auth/change-password` | Publik / Terautentikasi |
| **Profil** | `GET`, `PATCH /api/profiles` | Admin, Dokter, Pasien |
| **Dokter Publik** | `GET /api/doctors` | Publik |
| **Users** | `GET`, `POST /api/users` • `PATCH`, `DELETE /api/users/[id]` | Admin |
| **Poliklinik** | `GET`, `POST /api/polis` • `PATCH`, `DELETE /api/polis/[id]` | Admin (GET: Publik/Auth) |
| **Jadwal Dokter** | `GET`, `POST /api/schedules` • `PATCH`, `DELETE /api/schedules/[id]` | Dokter |
| **Obat Farmasi** | `GET`, `POST /api/medicines` • `PATCH`, `DELETE /api/medicines/[id]` | Admin (GET: Dokter/Admin) |
| **Janji Temu** | `GET`, `POST /api/appointments` • `PATCH /api/appointments/[id]` | Pasien, Dokter, Admin |
| **Rekam Medis** | `GET`, `POST /api/medical-records` | Dokter, Pasien |
| **Resep Farmasi** | `GET /api/prescriptions` • `PATCH /api/prescriptions/[id]` | Admin |

## Identitas Pengembang

* **Nama:** Muh. Alief Nur Afanni Arfan
* **NIM:** H071251031
* **Program Studi:** Sistem Informasi
* **Institusi:** Universitas Hasanuddin
* **GitHub:** [@aliefnarfan](https://github.com/aliefnarfan)