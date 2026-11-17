import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  try {
    console.log('Memulai seeding database GuseoCare...');

    const adminPassword = await bcrypt.hash('admin123', 10);
    const doctorPassword = await bcrypt.hash('dokter123', 10);
    const patientPassword = await bcrypt.hash('pasien123', 10);

    // 1. Insert Master Polis
    await pool.query(`
      INSERT INTO polis (name, "desc")
      VALUES 
        ('Poli Bedah Umum', 'Layanan konsultasi dan tindakan bedah umum, bedah saraf, serta bedah toraks kardiovaskular.'),
        ('Poli Penyakit Dalam', 'Penanganan keluhan organ dalam, terapi intensif, dan gangguan metabolik.'),
        ('Poli Umum', 'Pemeriksaan kesehatan dasar, layanan emergensi, dan rujukan spesialis.')
      ON CONFLICT (name) DO NOTHING;
    `);

    // 2. Insert Admin
    await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ('Admin GuseoCare', 'admin@guseocare.id', $1, 'admin')
       ON CONFLICT (email) DO NOTHING;`,
      [adminPassword]
    );

    // 3. Insert 4 Pasien (Doctor X: Mafia in White)
    const patients = [
      { name: 'Ha Mi-ju', email: 'ha.miju@guseocare.id' },
      { name: 'Seo Byeong-gyu', email: 'seo.byeonggyu@guseocare.id' },
      { name: 'Lee Ju-hui', email: 'lee.juhui@guseocare.id' },
      { name: 'Park Gwang-cheol', email: 'park.gwangcheol@guseocare.id' },
    ];

    for (const p of patients) {
      await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'pasien')
         ON CONFLICT (email) DO NOTHING;`,
        [p.name, p.email, patientPassword]
      );
    }

    // 4. Insert 11 Dokter RS Pendidikan Universitas Guseo
    const doctors = [
      {
        name: 'Dr. Gye Su-jeong, Sp.B, Sp.BTKV',
        email: 'gye.sujeong@guseocare.id',
        poli: 'Poli Bedah Umum',
        bio: 'Dokter Bedah Lepas (Freelance), Spesialis Bedah Umum & Toraks Kardiovaskular.',
      },
      {
        name: 'Prof. Dr. Do Yun-sik, Sp.B',
        email: 'do.yunsik@guseocare.id',
        poli: 'Poli Bedah Umum',
        bio: 'Profesor & Dokter Spesialis Bedah Umum Universitas Guseo.',
      },
      {
        name: 'Prof. Dr. Hwang Min-gu, Sp.BS',
        email: 'hwang.mingu@guseocare.id',
        poli: 'Poli Bedah Umum',
        bio: 'Profesor & Dokter Spesialis Bedah Saraf dan Bedah Umum.',
      },
      {
        name: 'Dr. Kim Seung-hyo, Sp.B',
        email: 'kim.seunghyo@guseocare.id',
        poli: 'Poli Bedah Umum',
        bio: 'Dokter Bedah Senior & Pendiri Korps Medis White Wings.',
      },
      {
        name: 'Prof. Dr. Jo Won-jin, Sp.PD',
        email: 'jo.wonjin@guseocare.id',
        poli: 'Poli Penyakit Dalam',
        bio: 'Profesor & Dokter Spesialis Penyakit Dalam dan Terapi Intensif.',
      },
      {
        name: 'Prof. Dr. Bae Heung-gon, Sp.PD',
        email: 'bae.heunggon@guseocare.id',
        poli: 'Poli Penyakit Dalam',
        bio: 'Profesor & Dokter Spesialis Penyakit Dalam Konsultan.',
      },
      {
        name: 'Dr. Ma Seong-gyu, Sp.PD',
        email: 'ma.seonggyu@guseocare.id',
        poli: 'Poli Penyakit Dalam',
        bio: 'Dokter Spesialis Penyakit Dalam & Gangguan Metabolik.',
      },
      {
        name: 'Dr. Na Dae-il, Sp.PD',
        email: 'na.daeil@guseocare.id',
        poli: 'Poli Penyakit Dalam',
        bio: 'Dokter Spesialis Penyakit Dalam RS Universitas Guseo.',
      },
      {
        name: 'Dr. Bu Seung-kwon',
        email: 'bu.seungkwon@guseocare.id',
        poli: 'Poli Umum',
        bio: 'Direktur Rumah Sakit Universitas Guseo (Cabang Seonam) & Dokter Konsultan.',
      },
      {
        name: 'Prof. Dr. Kim Seong-jin',
        email: 'kim.seongjin@guseocare.id',
        poli: 'Poli Umum',
        bio: 'Profesor & Kepala Departemen Layanan Umum dan Emergensi.',
      },
      {
        name: 'Dr. Park Tae-gyeong',
        email: 'park.taegyeong@guseocare.id',
        poli: 'Poli Umum',
        bio: 'Dokter Residen & Pemeriksaan Kesehatan Umum.',
      },
    ];

    for (const doc of doctors) {
      await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, 'dokter')
         ON CONFLICT (email) DO NOTHING;`,
        [doc.name, doc.email, doctorPassword]
      );

      const userRes = await pool.query('SELECT user_id FROM users WHERE email = $1', [doc.email]);
      const poliRes = await pool.query('SELECT poli_id FROM polis WHERE name = $1', [doc.poli]);

      if (userRes.rows.length > 0 && poliRes.rows.length > 0) {
        await pool.query(
          `INSERT INTO doctor_profiles (user_id, poli_id, bio)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id) DO NOTHING;`,
          [userRes.rows[0].user_id, poliRes.rows[0].poli_id, doc.bio]
        );
      }
    }

    // 5. Insert Schedules (Slot 30 Menit) jika belum ada jadwal
    const docProfiles = await pool.query('SELECT doctor_id FROM doctor_profiles ORDER BY doctor_id ASC');
    const existingSch = await pool.query('SELECT COUNT(*) FROM schedules');

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
    const existingMed = await pool.query('SELECT COUNT(*) FROM medicines');
    if (Number(existingMed.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO medicines (name, "desc", type, stock)
        VALUES 
          ('Paracetamol 500mg', 'Pereda demam dan nyeri ringan hingga sedang.', 'biasa', 100),
          ('Amoxicillin 500mg', 'Antibiotik spektrum luas (wajib resep dokter).', 'keras', 50),
          ('Omeprazole 20mg', 'Obat asam lambung dan tukak lambung.', 'keras', 40),
          ('Vitamin C 500mg', 'Suplemen daya tahan tubuh.', 'biasa', 150);
      `);
    }

    console.log('Seeding GuseoCare selesai! Seluruh akun (1 Admin, 11 Dokter, 4 Pasien) siap digunakan.');
  } catch (err) {
    console.error('Gagal melakukan seeding:', err);
  } finally {
    await pool.end();
  }
}

seed();