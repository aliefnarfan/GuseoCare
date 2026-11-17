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
        pr.prs_id,
        pr.mr_id,
        pr.status,
        pr.created_at,
        p_user.name AS patient_name,
        d_user.name AS doctor_name,
        mr.diagnosis,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'prsi_id', pi.prsi_id,
              'med_id', pi.med_id,
              'medicine_name', m.name,
              'medicine_type', m.type,
              'current_stock', m.stock,
              'quantity', pi.quantity
            ) ORDER BY pi.prsi_id ASC
          ) FILTER (WHERE pi.prsi_id IS NOT NULL),
          '[]'
        ) AS items
      FROM prescriptions pr
      JOIN medical_records mr ON pr.mr_id = mr.mr_id
      JOIN appointments a ON mr.apt_id = a.apt_id
      JOIN users p_user ON a.patient_id = p_user.user_id
      JOIN doctor_profiles dp ON a.doctor_id = dp.doctor_id
      JOIN users d_user ON dp.user_id = d_user.user_id
      LEFT JOIN prescription_items pi ON pr.prs_id = pi.prs_id
      LEFT JOIN medicines m ON pi.med_id = m.med_id
      ${whereClause}
      GROUP BY pr.prs_id, p_user.user_id, d_user.user_id, mr.mr_id
      ORDER BY pr.created_at DESC, pr.prs_id DESC
      `,
      values
    );

    return NextResponse.json({ prescriptions: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}