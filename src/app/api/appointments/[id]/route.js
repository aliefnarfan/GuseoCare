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
    const { status, rejection_reason } = await request.json();

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

    const existingRes = await pool.query(
      `
      SELECT a.*, dp.user_id AS doctor_user_id
      FROM appointments a
      JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
      WHERE a.apt_id = $1
      `,
      [id]
    );

    const apt = existingRes.rows[0];
    if (!apt) {
      return NextResponse.json({ error: 'Janji temu tidak ditemukan.' }, { status: 404 });
    }

    if (user.role === 'pasien') {
      if (apt.patient_id !== user.user_id || status !== 'cancelled') {
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
    } else if (user.role === 'dokter' && apt.doctor_user_id !== user.user_id) {
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
      [status, status === 'rejected' ? rejection_reason : null, id]
    );

    return NextResponse.json({
      message: `Status janji temu berhasil diubah menjadi ${status}.`,
      appointment: updateRes.rows[0],
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}