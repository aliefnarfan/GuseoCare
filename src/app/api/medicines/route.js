import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dokter')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await pool.query(`
      SELECT med_id, name, "desc", type, stock
      FROM medicines
      ORDER BY name ASC
    `);

    return NextResponse.json({ medicines: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang dapat menambah data obat.' }, { status: 403 });
    }

    const { name, desc, type, stock } = await request.json();

    if (!name || !['keras', 'biasa'].includes(type) || stock == null || stock < 0) {
      return NextResponse.json(
        { error: 'Nama obat, tipe (keras/biasa), dan stok >= 0 wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO medicines (name, "desc", type, stock)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [name, desc || null, type, stock]
    );

    return NextResponse.json(
      { message: 'Obat berhasil ditambahkan.', medicine: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}