import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('guseocare_session')?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}