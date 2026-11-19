import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const values = [];
    let whereClause = '';

    if (user.role === 'pasien') {
      values.push(user.user_id);
      whereClause = 'WHERE a.patient_id = $1';
    } else if (user.role === 'dokter') {
      values.push(user.user_id);
      whereClause = 'WHERE dp.user_id = $1';
    }

    const result = await pool.query(
      `
      SELECT 
        a.apt_id,
        a.patient_id,
        p_user.name AS patient_name,
        p_user.email AS patient_email,
        a.doctor_id,
        d_user.name AS doctor_name,
        pl.name AS poli_name,
        a.sch_id,
        s.day,
        s.start_time,
        s.duration,
        a.booking_date,
        a.booking_date AS apt_date,
        a.complaint,
        a.status,
        a.rejection_reason,
        a.rejection_reason AS reject_reason,
        a.created_at
      FROM appointments a
      JOIN users p_user ON a.patient_id = p_user.user_id
      JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
      JOIN users d_user ON dp.user_id = d_user.user_id
      JOIN polis pl ON dp.poli_id = pl.poli_id
      JOIN schedules s ON a.sch_id = s.sch_id
      ${whereClause}
      ORDER BY a.booking_date DESC, s.start_time ASC, a.apt_id DESC
      `,
      values
    );

    return NextResponse.json({ appointments: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'pasien') {
      return NextResponse.json(
        { error: 'Hanya akun pasien yang dapat membuat janji temu.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const doctor_id = body.doctor_id ?? body.doctorId;
    const sch_id = body.sch_id ?? body.schedule_id ?? body.scheduleId ?? body.schId;
    const booking_date = body.booking_date ?? body.apt_date ?? body.bookingDate ?? body.date;
    const complaint = (body.complaint ?? body.symptoms ?? '').trim();

    if (!doctor_id || !sch_id || !booking_date || !complaint) {
      return NextResponse.json(
        { error: 'Dokter, jadwal, tanggal booking, dan keluhan wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Pastikan jadwal (sch_id) benar-benar milik dokter (doctor_id) yang dipilih
    const scheduleCheck = await pool.query(
      'SELECT sch_id FROM schedules WHERE sch_id = $1 AND doctor_id = $2',
      [sch_id, doctor_id]
    );
    if (scheduleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Jadwal tidak valid atau tidak sesuai dengan dokter yang dipilih.' },
        { status: 400 }
      );
    }

    // 2. Validasi anti-bentrok: cek apakah slot jadwal & tanggal sudah dibooking pasien lain
    const conflictCheck = await pool.query(
      `
      SELECT apt_id FROM appointments
      WHERE doctor_id = $1
        AND sch_id = $2
        AND booking_date = $3
        AND status NOT IN ('rejected', 'cancelled')
      `,
      [doctor_id, sch_id, booking_date]
    );

    if (conflictCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'Slot jadwal pada tanggal tersebut sudah terisi. Silakan pilih jam atau tanggal lain.' },
        { status: 409 }
      );
    }

    // 3. Simpan janji temu baru dengan status awal 'pending'
    const insertRes = await pool.query(
      `
      INSERT INTO appointments (patient_id, doctor_id, sch_id, booking_date, complaint, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
      `,
      [user.user_id, doctor_id, sch_id, booking_date, complaint]
    );

    return NextResponse.json(
      {
        message: 'Janji temu berhasil dibuat dan menunggu konfirmasi.',
        appointment: insertRes.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}