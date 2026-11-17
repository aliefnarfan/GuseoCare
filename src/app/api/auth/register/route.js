import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nama, email, dan password wajib diisi.' },
        { status: 400 }
      );
    }

    // Cek apakah email sudah terdaftar
    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email sudah digunakan oleh akun lain.' },
        { status: 409 }
      );
    }

    // Hash password dengan bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'pasien')
       RETURNING user_id, name, email, role`,
      [name, email, hashedPassword]
    );

    return NextResponse.json(
      { message: 'Registrasi berhasil! Silakan login.', user: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}