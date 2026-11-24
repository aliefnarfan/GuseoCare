import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat mengubah poliklinik.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { name, description, desc } = await request.json();
    const poliDesc = (description ?? desc)?.trim() || null;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Nama poliklinik wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE polis
       SET name = $1,
           "desc" = $2
       WHERE poli_id = $3
       RETURNING poli_id, name, "desc", "desc" AS description`,
      [name.trim(), poliDesc, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Poliklinik tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Data poliklinik berhasil diperbarui.',
      poli: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Nama poliklinik sudah digunakan.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat menghapus poliklinik.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const result = await pool.query(
      'DELETE FROM polis WHERE poli_id = $1 RETURNING poli_id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Poliklinik tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Poliklinik "${result.rows[0].name}" berhasil dihapus.`,
    });
  } catch (error) {
    if (error.code === '23001' || error.code === '23503') {
      return NextResponse.json(
        {
          error:
            'Poliklinik tidak dapat dihapus karena masih memiliki dokter yang terdaftar di poli ini. Pindahkan dokter ke poli lain terlebih dahulu.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus poliklinik.' },
      { status: 500 }
    );
  }
}