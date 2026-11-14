-- 1. Tabel Users (Admin, Dokter, Pasien)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'dokter', 'pasien')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Polis (Master Poli)
CREATE TABLE IF NOT EXISTS polis (
    poli_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    "desc" TEXT,
    img TEXT
);

-- 3. Tabel Doctor Profiles
CREATE TABLE IF NOT EXISTS doctor_profiles (
    doctor_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    poli_id INT NOT NULL REFERENCES polis(poli_id) ON DELETE RESTRICT,
    bio TEXT,
	img TEXT
);

-- 4. Tabel Schedules (Jadwal Praktik Dokter)
CREATE TABLE IF NOT EXISTS schedules (
    sch_id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL REFERENCES doctor_profiles(doctor_id) ON DELETE CASCADE,
    day VARCHAR(20) NOT NULL CHECK (day IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')),
    start_time TIME NOT NULL,
    duration INT NOT NULL DEFAULT 30 CHECK (duration = 30)
);

-- 5. Tabel Appointments (Janji Temu)
CREATE TABLE IF NOT EXISTS appointments (
    apt_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctor_profiles(doctor_id) ON DELETE CASCADE,
    sch_id INT NOT NULL REFERENCES schedules(sch_id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    complaint TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'done')),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Medicines (Master Obat)
CREATE TABLE IF NOT EXISTS medicines (
    med_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    "desc" TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('keras', 'biasa')),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    img TEXT
);

-- 7. Tabel Medical Records (Rekam Medis - Read-only / Permanen)
CREATE TABLE medical_records (
    mr_id SERIAL PRIMARY KEY,
    apt_id INT UNIQUE NOT NULL REFERENCES appointments(apt_id) ON DELETE RESTRICT,
    diagnosis TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel Prescriptions (Antrean Resep Farmasi)
CREATE TABLE IF NOT EXISTS prescriptions (
    prs_id SERIAL PRIMARY KEY,
    mr_id INT UNIQUE NOT NULL REFERENCES medical_records(mr_id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'menunggu diproses' CHECK (status IN ('menunggu diproses', 'siap diambil', 'sudah diambil')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel Prescription Items (Detail Obat & Jumlah per Resep)
CREATE TABLE IF NOT EXISTS prescription_items (
    prsi_id SERIAL PRIMARY KEY,
    prs_id INT NOT NULL REFERENCES prescriptions(prs_id) ON DELETE CASCADE,
    med_id INT NOT NULL REFERENCES medicines(med_id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0)
);