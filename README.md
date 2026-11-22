# GuseoCare — SIMRS RS Pendidikan Universitas Guseo

**GuseoCare** adalah aplikasi web Sistem Informasi Manajemen Rumah Sakit (SIMRS) berbasis **Next.js (App Router)**, **Tailwind CSS**, dan **PostgreSQL**. Aplikasi ini dirancang untuk mengintegrasikan alur layanan pasien, praktik dokter spesialis, serta operasional administrasi dan instalasi farmasi dalam satu platform terpadu.

---

## Fitur Utama

### 1. Portal Publik & Autentikasi
- **Halaman Beranda:** Informasi layanan poliklinik, direktori dokter spesialis lengkap dengan foto profil dan jadwal praktik, serta informasi kontak dan jam besuk.
- **Autentikasi Berbasis Peran (RBAC):** Login, registrasi pasien mandiri, ubah kata sandi, dan proteksi rute otomatis melalui `middleware.js` untuk peran **Pasien**, **Dokter**, dan **Admin/Farmasi**.

### 2. Dashboard Pasien (`/dashboard/pasien`)
- **Pendaftaran Konsultasi:** Pemilihan poliklinik, dokter, slot waktu praktik (durasi 30 menit) dengan validasi kecocokan hari dan pencegahan bentrok jadwal (*anti-double booking*), serta panel ringkasan janji temu *real-time*.
- **Manajemen Jadwal:** Pengurutan otomatis berdasarkan jadwal aktif terdekat, filter status (*Semua*, *Aktif*, *Selesai/Batal*), fitur **Ubah Jadwal (Reschedule)**, dan pembatalan mandiri dengan konfirmasi modal.
- **Rekam Medis & Resep:** Melihat hasil diagnosis dokter, tindakan klinis, catatan anjuran, serta status penyiapan resep obat dari farmasi.

### 3. Dashboard Dokter (`/dashboard/dokter`)
- **Antrean & Konfirmasi:** Menyetujui jadwal masuk atau menolak pengajuan dengan alasan penolakan yang jelas.
- **Pemeriksaan Klinis & Resep Dinamis:** Menginput diagnosis, tindakan klinis, anjuran, serta menerbitkan resep obat secara dinamis yang langsung terhubung ke instalasi farmasi.
- **Riwayat Pemeriksaan:** Melihat daftar rekam medis pasien yang telah ditangani.

### 4. Dashboard Admin & Farmasi (`/dashboard/admin`)
- **Antrean Resep Farmasi:** Memproses resep secara berjenjang (`menunggu diproses` → `siap diambil` → `sudah diambil`) dengan **pemotongan stok obat otomatis dan transaksional** di database.
- **Manajemen Stok Obat:** Pencarian inventaris, indikator stok menipis, tambah obat baru, dan pembaruan/restok jumlah obat.
- **Monitoring Janji Temu:** Memantau seluruh jadwal konsultasi lintas poliklinik dan dokter.

---

## Teknologi yang Digunakan

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (`pg`)
- **Keamanan & Autentikasi:** `bcryptjs` (hashing password) & HTTP-only Session Cookie / JWT

---

## Prasyarat

Pastikan perangkat Anda sudah terpasang:
- **Node.js** versi `18.x` atau `20.x` ke atas (disarankan Node.js `20.6+` agar mendukung flag `--env-file`)
- **PostgreSQL** versi `14` atau lebih baru (beserta `psql` atau pgAdmin 4)
- **Git**

---

## Panduan Instalasi & Setup

### 1. Clone Repositori
```bash
git clone https://github.com/aliefnarfan/GuseoCare.git
cd GuseoCare
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables (`.env.example`)
Aplikasi ini menggunakan variabel lingkungan untuk koneksi database PostgreSQL dan kunci rahasia sesi autentikasi.

1. Salin file `.env.example` menjadi `.env.local` di direktori root proyek:

   **Windows (PowerShell):**
   ```powershell
   Copy-Item .env.example .env.local
   ```

   **macOS / Linux / Git Bash:**
   ```bash
   cp .env.example .env.local
   ```

2. Buka file `.env.local` dan sesuaikan nilainya dengan konfigurasi lokal Anda. Berikut format standar yang ada pada `.env.example`:

   ```env
   # Koneksi Database PostgreSQL
   # Format: postgresql://<username>:<password>@<host>:<port>/<nama_database>
   DATABASE_URL="postgresql://postgres:password_anda@localhost:5432/guseocare"

   # Kunci rahasia untuk menandatangani token sesi autentikasi (gunakan string acak yang kuat)
   JWT_SECRET="ganti_dengan_secret_key_acak_yang_panjang_dan_aman"
   ```

### 4. Setup Database PostgreSQL
1. Buat database baru di PostgreSQL (melalui pgAdmin 4 atau terminal `psql`), misalnya bernama `guseocare`:
   ```sql
   CREATE DATABASE guseocare;
   ```
2. Jalankan file **`schema.sql`** untuk membuat seluruh tabel, relasi *foreign key*, *constraint*, dan indeks:
   ```bash
   psql -U postgres -d guseocare -f schema.sql
   ```
   *(Atau buka Query Tool di pgAdmin 4 pada database `guseocare`, lalu salin dan jalankan seluruh isi `schema.sql`).*

### 5. Seeding Data Awal (`seed.js`)
Jalankan skrip `seed.js` untuk mengisi data master poliklinik, obat, jadwal praktik, serta akun demo (1 Admin, 11 Dokter, dan 4 Pasien):

```bash
node --env-file=.env.local seed.js
```

> Jika Anda menggunakan Node.js di bawah versi `20.6`, set variabel `DATABASE_URL` terlebih dahulu di terminal sebelum menjalankan `node seed.js`.

#### Akun Demo Bawaan (Hasil Seeding)
| Peran | Email | Password |
| :--- | :--- | :--- |
| **Admin / Farmasi** | `admin@guseocare.id` | `admin123` |
| **Dokter** | `gye.sujeong@guseocare.id` *(atau email dokter lain di `seed.js`)* | `dokter123` |
| **Pasien** | `lee.juhui@guseocare.id` *(atau `ha.miju@guseocare.id`)* | `pasien123` |

### 6. Jalankan Aplikasi
```bash
npm run dev
```
Buka browser dan akses **`http://localhost:3000`**.

---

## Struktur Folder Proyek

```text
GuseoCare/
├── public/                             # Aset statis yang dapat diakses langsung oleh browser
│   ├── doctors/                        # Foto profil dokter (penamaan berdasarkan doctor_id, mis. 3.jpg - 13.jpg)
│   ├── guseocare-logo.ico              # Logo dan favicon resmi GuseoCare
│   └── hospital-bg.webp                # Gambar latar belakang halaman beranda
│
├── src/
│   ├── app/                            # Next.js App Router (Halaman UI & API Routes)
│   │   ├── api/                        # Backend REST API Endpoints
│   │   │   ├── appointments/           # GET/POST janji temu & PATCH [id] (reschedule, approve, reject, cancel)
│   │   │   ├── auth/                   # Autentikasi: login, logout, register, me, dan change-password
│   │   │   ├── doctors/                # GET daftar dokter beserta jadwal praktiknya
│   │   │   ├── medical-records/        # GET/POST rekam medis beserta penerbitan resep
│   │   │   ├── medicines/              # GET/POST daftar obat & PATCH [id] untuk edit/restok
│   │   │   ├── polis/                  # GET daftar unit poliklinik
│   │   │   └── prescriptions/          # GET antrean resep & PATCH [id] (proses status & potong stok)
│   │   │
│   │   ├── dashboard/                  # Halaman portal sesuai peran pengguna
│   │   │   ├── admin/page.jsx          # Dashboard Admin & Instalasi Farmasi
│   │   │   ├── dokter/page.jsx         # Dashboard Praktik Dokter
│   │   │   └── pasien/page.jsx         # Dashboard Layanan Pasien
│   │   │
│   │   ├── login/page.jsx              # Halaman Masuk (Login)
│   │   ├── register/page.jsx           # Halaman Pendaftaran Akun Pasien
│   │   ├── globals.css                 # Konfigurasi CSS global & Tailwind CSS
│   │   ├── layout.js                   # Root layout aplikasi & metadata HTML
│   │   └── page.js                     # Halaman utama (Landing Page GuseoCare)
│   │
│   ├── components/                     # Komponen UI yang dapat digunakan ulang
│   │   ├── DoctorCard.jsx              # Kartu profil dokter dengan foto & fallback inisial
│   │   ├── DoctorDirectory.jsx         # Filter poliklinik & daftar kartu dokter di beranda
│   │   ├── Footer.jsx                  # Footer informasi alamat, navigasi, kontak, & jam besuk
│   │   ├── Navbar.jsx                  # Navigasi atas responsif dengan indikator section & peran aktif
│   │   └── StatusBadge.jsx             # Lencana warna status janji temu & status resep farmasi
│   │
│   ├── lib/                            # Utilitas inti server & database
│   │   ├── auth.js                     # Helper pembuatan dan verifikasi token autentikasi
│   │   ├── db.js                       # Konfigurasi connection pool PostgreSQL (pg)
│   │   └── session.js                  # Helper pembacaan sesi pengguna aktif dari cookie
│   │
│   └── middleware.js                   # Proteksi rute otomatis & pengalihan berdasarkan peran
│
├── .env.example                        # Template variabel lingkungan (untuk disalin ke .env.local)
├── .gitignore                          # Daftar file/folder yang tidak dilacak Git
├── eslint.config.mjs                   # Konfigurasi ESLint
├── jsconfig.json                       # Konfigurasi path alias (@/* -> ./src/*)
├── next.config.mjs                     # Konfigurasi Next.js
├── package.json                        # Daftar dependensi & skrip NPM
├── schema.sql                          # Skema DDL struktur tabel & indeks PostgreSQL
└── seed.js                             # Skrip seeding data awal & akun demo (dengan hashing bcrypt)
```

---

## Catatan Tambahan

- **Foto Profil Dokter:** Komponen `DoctorCard.jsx` membaca foto dari `public/doctors/{doctor_id}.jpg`. Apabila foto untuk `doctor_id` tertentu belum tersedia, kartu akan otomatis menampilkan avatar inisial nama dokter.
- **Produksi (Build):** Untuk membangun dan menjalankan aplikasi dalam mode produksi:
  ```bash
  npm run build
  npm run start
  ```