import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  try {
    console.log('Memulai seeding database GuseoCare...');

    // 1. Hash password standar untuk akun awal
    const adminPassword = await bcrypt.hash('admin123', 10);
    const doctorPassword = await bcrypt.hash('dokter123', 10);
    const patientPassword = await bcrypt.hash('pasien123', 10);

    // 2. Insert Users (Admin, 2 Dokter, 1 Pasien)
    await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES 
         ('Admin GuseoCare', 'admin@guseocare.id', $1, 'admin'),
         ('Dr. Michiko Daimon, Sp.B', 'michiko@guseocare.id', $2, 'dokter'),
         ('Dr. Akira Kaji, Sp.PD', 'akira@guseocare.id', $2, 'dokter'),
         ('Budi Santoso', 'pasien@guseocare.id', $3, 'pasien')
       ON CONFLICT (email) DO NOTHING;`,
      [adminPassword, doctorPassword, patientPassword]
    );

    // 3. Insert Master Polis
    await pool.query(
      `INSERT INTO polis (name, "desc")
       VALUES 
         ('Poli Bedah Umum', 'Layanan konsultasi dan tindakan bedah umum terpadu.'),
         ('Poli Penyakit Dalam', 'Penanganan keluhan organ dalam, metabolik, dan infeksi.'),
         ('Poli Umum', 'Pemeriksaan kesehatan dasar dan rujukan spesialis.')
       ON CONFLICT (name) DO NOTHING;`
    );

    // 4. Ambil ID Dokter & Poli untuk relasi doctor_profiles
    const michikoUser = await pool.query(`SELECT user_id FROM users WHERE email = 'michiko@guseocare.id'`);
    const akiraUser = await pool.query(`SELECT user_id FROM users WHERE email = 'akira@guseocare.id'`);
    const poliBedah = await pool.query(`SELECT poli_id FROM polis WHERE name = 'Poli Bedah Umum'`);
    const poliDalam = await pool.query(`SELECT poli_id FROM polis WHERE name = 'Poli Penyakit Dalam'`);

    if (michikoUser.rows.length > 0 && poliBedah.rows.length > 0) {
      await pool.query(
        `INSERT INTO doctor_profiles (user_id, poli_id, bio)
         VALUES ($1, $2, 'Spesialis Bedah dengan presisi tinggi. Motto: Saya tidak pernah gagal.')
         ON CONFLICT (user_id) DO NOTHING;`,
        [michikoUser.rows[0].user_id, poliBedah.rows[0].poli_id]
      );
    }

    if (akiraUser.rows.length > 0 && poliDalam.rows.length > 0) {
      await pool.query(
        `INSERT INTO doctor_profiles (user_id, poli_id, bio)
         VALUES ($1, $2, 'Spesialis Penyakit Dalam berpengalaman di Universitas Guseo.')
         ON CONFLICT (user_id) DO NOTHING;`,
        [akiraUser.rows[0].user_id, poliDalam.rows[0].poli_id]
      );
    }

    // 5. Insert Schedules (Slot 30 Menit) jika belum ada jadwal
    const docProfiles = await pool.query(`SELECT doctor_id FROM doctor_profiles`);
    const existingSch = await pool.query(`SELECT COUNT(*) FROM schedules`);

    if (Number(existingSch.rows[0].count) === 0 && docProfiles.rows.length > 0) {
      for (const doc of docProfiles.rows) {
        await pool.query(
          `INSERT INTO schedules (doctor_id, day, start_time, duration)
           VALUES 
             ($1, 'Senin', '09:00:00', 30),
             ($1, 'Senin', '09:30:00', 30),
             ($1, 'Rabu', '10:00:00', 30);`,
          [doc.doctor_id]
        );
      }
    }

    // 6. Insert Master Medicines
    const existingMed = await pool.query(`SELECT COUNT(*) FROM medicines`);
    if (Number(existingMed.rows[0].count) === 0) {
      await pool.query(
        `INSERT INTO medicines (name, "desc", type, stock)
         VALUES 
           ('Paracetamol 500mg', 'Pereda demam dan nyeri ringan hingga sedang.', 'biasa', 100),
           ('Amoxicillin 500mg', 'Antibiotik spektrum luas (wajib resep dokter).', 'keras', 50),
           ('Omeprazole 20mg', 'Obat asam lambung dan tukak lambung.', 'keras', 40),
           ('Vitamin C 500mg', 'Suplemen daya tahan tubuh.', 'biasa', 150);`
      );
    }

    console.log('Seeding selesai! Akun siap digunakan:');
    console.log('- Admin  : admin@guseocare.id  | admin123');
    console.log('- Dokter : michiko@guseocare.id | dokter123');
    console.log('- Pasien : pasien@guseocare.id  | pasien123');
  } catch (err) {
    console.error('Gagal melakukan seeding:', err);
  } finally {
    await pool.end();
  }
}

seed();