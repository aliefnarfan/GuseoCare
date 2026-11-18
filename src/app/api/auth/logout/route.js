import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('guseocare_session');
  cookieStore.delete('session_user');

  return NextResponse.json({ message: 'Logout berhasil.' });
}