import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function PATCH(request, { params }) {
  const client = await pool.connect();
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat mengubah data pengguna.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { name, email, password, role, poli_id, bio } = await request.json();

    if (!name?.trim() || !email?.trim() || !role) {
      return NextResponse.json(
        { error: 'Nama, email, dan peran wajib diisi.' },
        { status: 400 }
      );
    }

    const allowedRoles = ['admin', 'dokter', 'pasien'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Peran tidak valid.' },
        { status: 400 }
      );
    }

    if (role === 'dokter' && !poli_id) {
      return NextResponse.json(
        { error: 'Poliklinik wajib dipilih untuk peran Dokter.' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    let hashedPassword = null;
    if (password && password.trim().length > 0) {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    }

    const updateRes = await client.query(
      `UPDATE users
       SET name = $1,
           email = $2,
           role = $3,
           password = COALESCE($4, password)
       WHERE user_id = $5
       RETURNING user_id, name, email, role, created_at`,
      [name.trim(), email.trim().toLowerCase(), role, hashedPassword, id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    if (role === 'dokter') {
      await client.query(
        `INSERT INTO doctor_profiles (user_id, poli_id, bio)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id)
         DO UPDATE SET poli_id = EXCLUDED.poli_id, bio = EXCLUDED.bio`,
        [id, Number(poli_id), bio?.trim() || null]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Data pengguna berhasil diperbarui.',
      user: updateRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email sudah digunakan oleh pengguna lain.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat menghapus pengguna.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (Number(id) === Number(currentUser.user_id)) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menghapus akun Anda sendiri.' },
        { status: 400 }
      );
    }

    // 1. Cek apakah pengguna masih memiliki riwayat janji temu (sebagai pasien atau dokter)
    const relationCheck = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM appointments a
       LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
       WHERE a.patient_id = $1 OR dp.user_id = $1`,
      [id]
    );

    if (relationCheck.rows[0].total > 0) {
      return NextResponse.json(
        {
          error:
            'Pengguna tidak dapat dihapus karena masih memiliki riwayat janji temu atau rekam medis yang tercatat di sistem.',
        },
        { status: 400 }
      );
    }

    // 2. Jika aman (tidak ada riwayat transaksi), lanjutkan penghapusan
    const deleteRes = await pool.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING user_id, name',
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Pengguna "${deleteRes.rows[0].name}" berhasil dihapus.`,
    });
  } catch (error) {
    if (error.code === '23001' || error.code === '23503') {
      return NextResponse.json(
        {
          error:
            'Pengguna tidak dapat dihapus karena masih terhubung dengan data lain di sistem.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus pengguna.' },
      { status: 500 }
    );
  }
}