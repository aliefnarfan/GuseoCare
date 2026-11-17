import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { verifySessionToken } from '@/lib/auth';

export async function PATCH(request) {
  try {
    // 1. Ambil dan verifikasi sesi dari Cookie
    const token = request.cookies.get('guseocare_session')?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Password lama dan password baru wajib diisi.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password baru minimal 6 karakter.' },
        { status: 400 }
      );
    }

    // 2. Ambil data user saat ini dari PostgreSQL
    const userRes = await pool.query(
      'SELECT user_id, password FROM users WHERE user_id = $1',
      [session.user_id]
    );
    const user = userRes.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
    }

    // 3. Verifikasi password lama
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Password lama tidak sesuai.' },
        { status: 401 }
      );
    }

    // 4. Hash password baru dan update ke database
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1 WHERE user_id = $2',
      [hashedNewPassword, session.user_id]
    );

    return NextResponse.json({ message: 'Password berhasil diperbarui.' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}