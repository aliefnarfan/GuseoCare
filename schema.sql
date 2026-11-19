-- ============================================================================
-- GuseoCare - SIMRS Universitas Guseo
-- Skema Database PostgreSQL (Terverifikasi & Sinkron dengan API Routes)
-- ============================================================================

-- 1. Tabel Pengguna (Admin, Dokter, Pasien)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'dokter', 'pasien')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Unit Poliklinik
CREATE TABLE polis (
    poli_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- 3. Tabel Profil Dokter Spesialis
CREATE TABLE doctor_profiles (
    doctor_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    poli_id INTEGER NOT NULL REFERENCES polis(poli_id) ON DELETE RESTRICT,
    bio TEXT
);

-- 4. Tabel Slot Jadwal Praktik Dokter
CREATE TABLE schedules (
    sch_id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(doctor_id) ON DELETE CASCADE,
    day VARCHAR(20) NOT NULL CHECK (day IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')),
    start_time TIME NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30
);

-- 5. Tabel Janji Temu Konsultasi (Mencakup status 'cancelled')
CREATE TABLE appointments (
    apt_id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(doctor_id) ON DELETE CASCADE,
    sch_id INTEGER NOT NULL REFERENCES schedules(sch_id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    complaint TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'done')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Rekam Medis Pemeriksaan Klinis
CREATE TABLE medical_records (
    mr_id SERIAL PRIMARY KEY,
    apt_id INTEGER UNIQUE NOT NULL REFERENCES appointments(apt_id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Master Obat Instalasi Farmasi
CREATE TABLE medicines (
    med_id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'bebas' CHECK (type IN ('bebas', 'bebas terbatas', 'keras')),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
);

-- 8. Tabel Header Resep Farmasi
CREATE TABLE prescriptions (
    prs_id SERIAL PRIMARY KEY,
    mr_id INTEGER UNIQUE NOT NULL REFERENCES medical_records(mr_id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'menunggu diproses'
        CHECK (status IN ('menunggu diproses', 'siap diambil', 'sudah diambil')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel Detail Item Obat per Resep
CREATE TABLE prescription_items (
    prsi_id SERIAL PRIMARY KEY,
    prs_id INTEGER NOT NULL REFERENCES prescriptions(prs_id) ON DELETE CASCADE,
    med_id INTEGER NOT NULL REFERENCES medicines(med_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- Indeks untuk mempercepat query dashboard & pencegahan bentrok jadwal
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, sch_id, booking_date);
CREATE INDEX idx_schedules_doctor ON schedules(doctor_id);
CREATE INDEX idx_prescriptions_mr ON prescriptions(mr_id);