import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT poli_id, name, "desc", "desc" AS description
      FROM polis
      ORDER BY poli_id ASC
    `);

    return NextResponse.json({ polis: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat menambahkan poliklinik.' },
        { status: 403 }
      );
    }

    const { name, description, desc } = await request.json();
    const poliDesc = (description ?? desc)?.trim() || null;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nama poliklinik wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO polis (name, "desc")
       VALUES ($1, $2)
       RETURNING poli_id, name, "desc", "desc" AS description`,
      [name.trim(), poliDesc]
    );

    return NextResponse.json(
      { message: 'Poliklinik berhasil ditambahkan.', poli: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Nama poliklinik sudah ada. Gunakan nama lain.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}