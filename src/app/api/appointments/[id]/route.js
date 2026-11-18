import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const aptId = Number(id);
    const body = await request.json();

    const existingRes = await pool.query(
      `
      SELECT a.*, dp.user_id AS doctor_user_id
      FROM appointments a
      JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
      WHERE a.apt_id = $1
      `,
      [aptId]
    );

    const apt = existingRes.rows[0];
    if (!apt) {
      return NextResponse.json({ error: 'Janji temu tidak ditemukan.' }, { status: 404 });
    }

    // MODE A: Pasien melakukan Ubah Jadwal (Reschedule) slot/tanggal
    const newSchId = body.sch_id ?? body.schedule_id;
    const newBookingDate = body.booking_date ?? body.apt_date;

    if (!body.status && (newSchId || newBookingDate)) {
      if (user.role !== 'pasien' || Number(apt.patient_id) !== Number(user.user_id)) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses untuk mengubah jadwal janji temu ini.' },
          { status: 403 }
        );
      }

      if (apt.status !== 'pending') {
        return NextResponse.json(
          { error: 'Hanya janji temu berstatus Menunggu Konfirmasi yang dapat diubah jadwalnya.' },
          { status: 400 }
        );
      }

      const targetSchId = Number(newSchId || apt.sch_id);
      const targetDate = newBookingDate || apt.booking_date;

      // 1. Pastikan slot jadwal milik dokter yang sama
      const scheduleCheck = await pool.query(
        'SELECT sch_id FROM schedules WHERE sch_id = $1 AND doctor_id = $2',
        [targetSchId, apt.doctor_id]
      );
      if (scheduleCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Slot jadwal tidak valid untuk dokter tersebut.' },
          { status: 400 }
        );
      }

      // 2. Cek bentrok jadwal dengan janji temu lain (kecuali janji temu ini sendiri)
      const conflictCheck = await pool.query(
        `
        SELECT apt_id FROM appointments
        WHERE doctor_id = $1
          AND sch_id = $2
          AND booking_date = $3
          AND apt_id <> $4
          AND status NOT IN ('rejected', 'cancelled')
        `,
        [apt.doctor_id, targetSchId, targetDate, aptId]
      );

      if (conflictCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Slot jadwal pada tanggal baru tersebut sudah terisi pasien lain.' },
          { status: 409 }
        );
      }

      const rescheduleRes = await pool.query(
        `
        UPDATE appointments
        SET sch_id = $1,
            booking_date = $2
        WHERE apt_id = $3
        RETURNING *
        `,
        [targetSchId, targetDate, aptId]
      );

      return NextResponse.json({
        message: 'Jadwal janji temu berhasil diperbarui.',
        appointment: rescheduleRes.rows[0],
      });
    }

    // MODE B: Perubahan Status (cancelled / approved / rejected / done)
    const status = body.status;
    const rejection_reason = (body.rejection_reason ?? body.reject_reason ?? '').trim();

    const allowedStatuses = ['approved', 'rejected', 'cancelled', 'done'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status tidak valid. Gunakan: approved, rejected, cancelled, atau done.' },
        { status: 400 }
      );
    }

    if (status === 'rejected' && !rejection_reason) {
      return NextResponse.json(
        { error: 'Alasan penolakan (rejection_reason) wajib diisi jika status rejected.' },
        { status: 400 }
      );
    }

    if (user.role === 'pasien') {
      if (Number(apt.patient_id) !== Number(user.user_id) || status !== 'cancelled') {
        return NextResponse.json(
          { error: 'Pasien hanya dapat membatalkan janji temu miliknya sendiri.' },
          { status: 403 }
        );
      }
      if (apt.status !== 'pending') {
        return NextResponse.json(
          { error: 'Hanya janji temu berstatus pending yang dapat dibatalkan.' },
          { status: 400 }
        );
      }
    } else if (
      user.role === 'dokter' &&
      Number(apt.doctor_user_id) !== Number(user.user_id)
    ) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke janji temu dokter lain.' },
        { status: 403 }
      );
    }

    const updateRes = await pool.query(
      `
      UPDATE appointments
      SET status = $1,
          rejection_reason = $2
      WHERE apt_id = $3
      RETURNING *
      `,
      [status, status === 'rejected' ? rejection_reason : null, aptId]
    );

    return NextResponse.json({
      message: `Status janji temu berhasil diubah menjadi ${status}.`,
      appointment: updateRes.rows[0],
    });
  } catch (error) {
    console.error('PATCH /api/appointments/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}