import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const values = [];
    let whereClause = '';

    if (user.role === 'pasien') {
      values.push(user.user_id);
      whereClause = 'WHERE a.patient_id = $1';
    } else if (user.role === 'dokter') {
      values.push(user.user_id);
      whereClause = 'WHERE dp.user_id = $1';
    }

    const result = await pool.query(
      `
      SELECT 
        mr.mr_id,
        mr.apt_id,
        a.booking_date,
        a.complaint,
        p_user.name AS patient_name,
        d_user.name AS doctor_name,
        pl.name AS poli_name,
        mr.diagnosis,
        mr.action,
        mr.notes,
        mr.created_at,
        pr.prs_id,
        pr.status AS prescription_status,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'prsi_id', pi.prsi_id,
              'med_id', pi.med_id,
              'medicine_name', m.name,
              'medicine_type', m.type,
              'quantity', pi.quantity
            ) ORDER BY pi.prsi_id ASC
          ) FILTER (WHERE pi.prsi_id IS NOT NULL),
          '[]'
        ) AS prescription_items
      FROM medical_records mr
      JOIN appointments a ON mr.apt_id = a.apt_id
      JOIN users p_user ON a.patient_id = p_user.user_id
      JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
      JOIN users d_user ON dp.user_id = d_user.user_id
      JOIN polis pl ON dp.poli_id = pl.poli_id
      LEFT JOIN prescriptions pr ON mr.mr_id = pr.mr_id
      LEFT JOIN prescription_items pi ON pr.prs_id = pi.prs_id
      LEFT JOIN medicines m ON pi.med_id = m.med_id
      ${whereClause}
      GROUP BY mr.mr_id, a.apt_id, p_user.user_id, d_user.user_id, pl.poli_id, pr.prs_id
      ORDER BY mr.created_at DESC, mr.mr_id DESC
      `,
      values
    );

    return NextResponse.json({ medical_records: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const client = await pool.connect();
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'dokter') {
      return NextResponse.json(
        { error: 'Hanya dokter yang dapat menginput rekam medis.' },
        { status: 403 }
      );
    }

    const { apt_id, diagnosis, action, notes, items } = await request.json();

    if (!apt_id || !diagnosis || !action) {
      return NextResponse.json(
        { error: 'ID janji temu, diagnosis, dan tindakan wajib diisi.' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // 1. Validasi kepemilikan janji temu & pastikan statusnya 'approved'
    const aptRes = await client.query(
      `
      SELECT a.apt_id, a.status, dp.user_id AS doctor_user_id
      FROM appointments a
      JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
      WHERE a.apt_id = $1
      `,
      [apt_id]
    );

    const apt = aptRes.rows[0];
    if (!apt) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Janji temu tidak ditemukan.' }, { status: 404 });
    }
    if (apt.doctor_user_id !== user.user_id) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Anda tidak berwenang memeriksa pasien dari dokter lain.' },
        { status: 403 }
      );
    }
    if (apt.status !== 'approved') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `Janji temu harus berstatus approved terlebih dahulu (status saat ini: ${apt.status}).` },
        { status: 400 }
      );
    }

    // 2. Simpan Rekam Medis
    const mrRes = await client.query(
      `
      INSERT INTO medical_records (apt_id, diagnosis, action, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [apt_id, diagnosis, action, notes || null]
    );
    const medicalRecord = mrRes.rows[0];

    // 3. Jika ada item obat diresepkan, buat Resep ('menunggu diproses') & Prescription Items
    let prescription = null;
    if (Array.isArray(items) && items.length > 0) {
      const prsRes = await client.query(
        `
        INSERT INTO prescriptions (mr_id, status)
        VALUES ($1, 'menunggu diproses')
        RETURNING *
        `,
        [medicalRecord.mr_id]
      );
      prescription = prsRes.rows[0];

      for (const item of items) {
        if (!item.med_id || !item.quantity || item.quantity <= 0) {
          throw new Error('Setiap item obat wajib memiliki med_id dan quantity > 0.');
        }
        await client.query(
          `
          INSERT INTO prescription_items (prs_id, med_id, quantity)
          VALUES ($1, $2, $3)
          `,
          [prescription.prs_id, item.med_id, item.quantity]
        );
      }
    }

    // 4. Tandai appointment sebagai 'done'
    await client.query(
      `UPDATE appointments SET status = 'done' WHERE apt_id = $1`,
      [apt_id]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      {
        message: 'Rekam medis dan resep berhasil disimpan.',
        medical_record: medicalRecord,
        prescription,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}