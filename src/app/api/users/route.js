import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat mengakses daftar pengguna.' },
        { status: 403 }
      );
    }

    const result = await pool.query(`
      SELECT
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
      ORDER BY u.created_at DESC, u.user_id DESC
    `);

    return NextResponse.json({ users: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const client = await pool.connect();
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat menambahkan pengguna.' },
        { status: 403 }
      );
    }

    const { name, email, password, role, poli_id, bio } = await request.json();

    if (!name?.trim() || !email?.trim() || !password?.trim() || !role) {
      return NextResponse.json(
        { error: 'Nama, email, password, dan peran wajib diisi.' },
        { status: 400 }
      );
    }

    const allowedRoles = ['admin', 'dokter', 'pasien'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Peran tidak valid. Pilih: admin, dokter, atau pasien.' },
        { status: 400 }
      );
    }

    if (role === 'dokter' && !poli_id) {
      return NextResponse.json(
        { error: 'Poliklinik wajib dipilih untuk pengguna dengan peran Dokter.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    const userRes = await client.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, email, role, created_at`,
      [name.trim(), email.trim().toLowerCase(), hashedPassword, role]
    );

    const newUser = userRes.rows[0];

    if (role === 'dokter') {
      await client.query(
        `INSERT INTO doctor_profiles (user_id, poli_id, bio)
         VALUES ($1, $2, $3)`,
        [newUser.user_id, Number(poli_id), bio?.trim() || null]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json(
      { message: 'Pengguna berhasil ditambahkan.', user: newUser },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email sudah terdaftar. Gunakan email lain.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}