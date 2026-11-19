import { NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('guseocare_session')?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 1. Proteksi rute khusus Admin
  if (pathname.startsWith('/dashboard/admin')) {
    if (!session || session.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Proteksi rute khusus Dokter
  if (pathname.startsWith('/dashboard/dokter')) {
    if (!session || session.role !== 'dokter') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 3. Proteksi rute khusus Pasien
  if (pathname.startsWith('/dashboard/pasien')) {
    if (!session || session.role !== 'pasien') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 4. Jika user sudah login dan membuka /login atau /register, arahkan ke dashboard masing-masing
  if ((pathname === '/login' || pathname === '/register') && session) {
    const dashboardMap = {
      admin: '/dashboard/admin',
      dokter: '/dashboard/dokter',
      pasien: '/dashboard/pasien',
    };
    return NextResponse.redirect(new URL(dashboardMap[session.role] || '/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/admin/:path*',
    '/dashboard/dokter/:path*',
    '/dashboard/pasien/:path*',
    '/login',
    '/register',
  ],
};