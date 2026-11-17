import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        p.poli_id, 
        p.name, 
        p."desc",
        COUNT(dp.doctor_id)::INT AS total_doctors
      FROM polis p
      LEFT JOIN doctor_profiles dp ON p.poli_id = dp.poli_id
      GROUP BY p.poli_id
      ORDER BY p.poli_id ASC
    `);

    return NextResponse.json({ polis: result.rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}