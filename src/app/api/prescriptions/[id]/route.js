import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function PATCH(request, { params }) {
  const client = await pool.connect();
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Hanya admin/farmasi yang dapat memproses status resep.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { status } = await request.json();

    const allowedStatuses = ['siap diambil', 'sudah diambil'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status resep tidak valid. Gunakan: siap diambil atau sudah diambil.' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    const prsRes = await client.query(
      'SELECT * FROM prescriptions WHERE prs_id = $1 FOR UPDATE',
      [id]
    );
    const prescription = prsRes.rows[0];

    if (!prescription) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Resep tidak ditemukan.' }, { status: 404 });
    }

    // Potong stok obat hanya saat transisi pertama kali dari 'menunggu diproses' -> 'siap diambil'
    if (prescription.status === 'menunggu diproses' && status === 'siap diambil') {
      const itemsRes = await client.query(
        `
        SELECT pi.med_id, pi.quantity, m.name, m.stock
        FROM prescription_items pi
        JOIN medicines m ON pi.med_id = m.med_id
        WHERE pi.prs_id = $1
        FOR UPDATE OF m
        `,
        [id]
      );

      for (const item of itemsRes.rows) {
        if (item.stock < item.quantity) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            {
              error: `Stok obat "${item.name}" tidak mencukupi (tersedia: ${item.stock}, dibutuhkan: ${item.quantity}).`,
            },
            { status: 400 }
          );
        }

        await client.query(
          'UPDATE medicines SET stock = stock - $1 WHERE med_id = $2',
          [item.quantity, item.med_id]
        );
      }
    } else if (prescription.status === 'menunggu diproses' && status === 'sudah diambil') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Resep harus diproses menjadi "siap diambil" terlebih dahulu sebelum diambil pasien.' },
        { status: 400 }
      );
    }

    const updateRes = await client.query(
      'UPDATE prescriptions SET status = $1 WHERE prs_id = $2 RETURNING *',
      [status, id]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      message: `Status resep berhasil diperbarui menjadi "${status}".`,
      prescription: updateRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}