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

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'dokter') {
      return NextResponse.json(
        { error: 'Hanya dokter yang dapat mengubah jadwal praktik.' },
        { status: 403 }
      );
    }

    const { id } = await params;

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
    const duration = 30;

    if (!day || !VALID_DAYS.includes(day)) {
      return NextResponse.json(
        { error: 'Hari praktik tidak valid.' },
        { status: 400 }
      );
    }

    if (!start_time || !/^\d{2}:\d{2}(:\d{2})?$/.test(start_time)) {
      return NextResponse.json(
        { error: 'Format jam mulai tidak valid.' },
        { status: 400 }
      );
    }

    // Cek tumpang tindih dengan jadwal lain (kecuali jadwal ini sendiri)
    const overlapCheck = await pool.query(
      `SELECT sch_id, start_time
       FROM schedules
       WHERE doctor_id = $1
         AND day = $2
         AND sch_id <> $3
         AND start_time < ($4::time + ($5 * INTERVAL '1 minute'))
         AND (start_time + (duration * INTERVAL '1 minute')) > $4::time`,
      [doctorId, day, id, start_time, duration]
    );

    if (overlapCheck.rows.length > 0) {
      const conflictTime = String(overlapCheck.rows[0].start_time).slice(0, 5);
      return NextResponse.json(
        {
          error: `Jadwal bentrok dengan slot praktik Anda pada hari ${day} pukul ${conflictTime} WITA.`,
        },
        { status: 409 }
      );
    }

    const updateRes = await pool.query(
      `UPDATE schedules
       SET day = $1, start_time = $2, duration = $3
       WHERE sch_id = $4 AND doctor_id = $5
       RETURNING sch_id, doctor_id, day, start_time, duration`,
      [day, start_time, duration, id, doctorId]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Jadwal tidak ditemukan atau bukan milik Anda.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Jadwal praktik berhasil diperbarui.',
      schedule: updateRes.rows[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memperbarui jadwal.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'dokter') {
      return NextResponse.json(
        { error: 'Hanya dokter yang dapat menghapus jadwal praktik.' },
        { status: 403 }
      );
    }

    const { id } = await params;

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

    const deleteRes = await pool.query(
      `DELETE FROM schedules
       WHERE sch_id = $1 AND doctor_id = $2
       RETURNING sch_id, day, start_time`,
      [id, doctorId]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Jadwal tidak ditemukan atau bukan milik Anda.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Jadwal hari ${deleteRes.rows[0].day} pukul ${String(deleteRes.rows[0].start_time).slice(0, 5)} WITA berhasil dihapus.`,
    });
  } catch (error) {
    if (error.code === '23001' || error.code === '23503') {
      return NextResponse.json(
        {
          error:
            'Jadwal tidak dapat dihapus karena sudah terhubung dengan riwayat janji temu pasien.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus jadwal.' },
      { status: 500 }
    );
  }
}