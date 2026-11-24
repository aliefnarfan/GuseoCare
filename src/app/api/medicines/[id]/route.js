import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { name, desc, type, stock } = await request.json();

    const result = await pool.query(
      `
      UPDATE medicines
      SET name = COALESCE($1, name),
          "desc" = COALESCE($2, "desc"),
          type = COALESCE($3, type),
          stock = COALESCE($4, stock)
      WHERE med_id = $5
      RETURNING *
      `,
      [name, desc, type, stock, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Obat tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Data obat berhasil diperbarui.',
      medicine: result.rows[0],
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin yang dapat menghapus data obat.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const result = await pool.query(
      'DELETE FROM medicines WHERE med_id = $1 RETURNING med_id, name',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Data obat tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Obat "${result.rows[0].name}" berhasil dihapus dari katalog.`,
    });
  } catch (error) {
    if (error.code === '23001' || error.code === '23503') {
      return NextResponse.json(
        {
          error:
            'Obat tidak dapat dihapus karena sudah tercatat dalam riwayat resep pasien. Anda dapat mengubah stoknya menjadi 0 jika tidak lagi digunakan.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus data obat.' },
      { status: 500 }
    );
  }
}