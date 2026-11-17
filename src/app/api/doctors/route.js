import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const poliId = searchParams.get('poli_id');

    const values = [];
    let whereClause = '';

    if (poliId) {
      values.push(poliId);
      whereClause = 'WHERE dp.poli_id = $1';
    }

    const result = await pool.query(
      `
      SELECT 
        dp.doctor_id,
        u.user_id,
        u.name,
        u.email,
        dp.bio,
        dp.img,
        p.poli_id,
        p.name AS poli_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'sch_id', s.sch_id,
              'day', s.day,
              'start_time', s.start_time,
              'duration', s.duration
            ) ORDER BY s.sch_id ASC
          ) FILTER (WHERE s.sch_id IS NOT NULL),
          '[]'
        ) AS schedules
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.user_id
      JOIN polis p ON dp.poli_id = p.poli_id
      LEFT JOIN schedules s ON dp.doctor_id = s.doctor_id
      ${whereClause}
      GROUP BY dp.doctor_id, u.user_id, p.poli_id
      ORDER BY dp.doctor_id ASC
      `,
      values
    );

    return NextResponse.json({ doctors: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}