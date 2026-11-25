import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Anda harus masuk terlebih dahulu.' },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `SELECT
         u.user_id,
         u.name,
         u.email,
         u.role,
         u.created_at,
         dp.doctor_id,
         dp.poli_id,
         dp.bio,
         p.name AS poli_name
       FROM users u
       LEFT JOIN doctor_profiles dp ON u.user_id = dp.user_id
       LEFT JOIN polis p ON dp.poli_id = p.poli_id
       WHERE u.user_id = $1`,
      [user.user_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Data pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile: result.rows[0] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal memuat data profil.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  const client = await pool.connect();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Anda harus masuk terlebih dahulu.' },
        { status: 401 }
      );
    }

    const { name, email, bio } = await request.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Nama lengkap dan email wajib diisi.' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE users
       SET name = $1, email = $2
       WHERE user_id = $3
       RETURNING user_id, name, email, role, created_at`,
      [name.trim(), email.trim().toLowerCase(), user.user_id]
    );

    if (user.role === 'dokter') {
      await client.query(
        `UPDATE doctor_profiles
         SET bio = $1
         WHERE user_id = $2`,
        [bio?.trim() || null, user.user_id]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Informasi profil berhasil diperbarui.',
      profile: updateRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email sudah digunakan oleh akun lain.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memperbarui profil.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}