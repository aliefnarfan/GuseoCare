import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

const VALID_DAYS = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'dokter') {
      return NextResponse.json(
        { error: 'Hanya dokter yang dapat mengakses manajemen jadwal praktik.' },
        { status: 403 }
      );
    }

    const docRes = await pool.query(
      'SELECT doctor_id FROM doctor_profiles WHERE user_id = $1',
      [user.user_id]
    );

    if (docRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Profil dokter tidak ditemukan.' },
        { status: 404 }
      );
    }

    const doctorId = docRes.rows[0].doctor_id;

    const result = await pool.query(
      `SELECT sch_id, doctor_id, day, start_time, duration
       FROM schedules
       WHERE doctor_id = $1
       ORDER BY
         CASE day
           WHEN 'Senin' THEN 1
           WHEN 'Selasa' THEN 2
           WHEN 'Rabu' THEN 3
           WHEN 'Kamis' THEN 4
           WHEN 'Jumat' THEN 5
           WHEN 'Sabtu' THEN 6
           WHEN 'Minggu' THEN 7
         END,
         start_time ASC`,
      [doctorId]
    );

    return NextResponse.json({ schedules: result.rows });
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal memuat jadwal praktik.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'dokter') {
      return NextResponse.json(
        { error: 'Hanya dokter yang dapat menambahkan jadwal praktik.' },
        { status: 403 }
      );
    }

    const docRes = await pool.query(
      'SELECT doctor_id FROM doctor_profiles WHERE user_id = $1',
      [user.user_id]
    );

    if (docRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Profil dokter tidak ditemukan.' },
        { status: 404 }
      );
    }

    const doctorId = docRes.rows[0].doctor_id;
    const { day, start_time } = await request.json();
    const duration = 30; // Durasi konsultasi wajib 30 menit

    if (!day || !VALID_DAYS.includes(day)) {
      return NextResponse.json(
        { error: 'Hari praktik tidak valid.' },
        { status: 400 }
      );
    }

    if (!start_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(start_time)) {
      return NextResponse.json(
        { error: 'Format jam mulai tidak valid (contoh: 09:00).' },
        { status: 400 }
      );
    }

    // Validasi anti tumpang tindih pada hari yang sama
    const overlapCheck = await pool.query(
      `SELECT sch_id, start_time, duration
       FROM schedules
       WHERE doctor_id = $1
         AND day = $2
         AND start_time < ($3::time + ($4 * INTERVAL '1 minute'))
         AND (start_time + (duration * INTERVAL '1 minute')) > $3::time`,
      [doctorId, day, start_time, duration]
    );

    if (overlapCheck.rows.length > 0) {
      const conflictTime = String(overlapCheck.rows[0].start_time).slice(0, 5);
      return NextResponse.json(
        {
          error: `Jadwal bentrok dengan slot praktik Anda pada hari ${day} pukul ${conflictTime} WITA. Pilih jam lain minimal berselisih 30 menit.`,
        },
        { status: 409 }
      );
    }

    const insertRes = await pool.query(
      `INSERT INTO schedules (doctor_id, day, start_time, duration)
       VALUES ($1, $2, $3, $4)
       RETURNING sch_id, doctor_id, day, start_time, duration`,
      [doctorId, day, start_time, duration]
    );

    return NextResponse.json(
      {
        message: `Jadwal hari ${day} pukul ${String(start_time).slice(0, 5)} WITA berhasil ditambahkan.`,
        schedule: insertRes.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menyimpan jadwal praktik.' },
      { status: 500 }
    );
  }
}