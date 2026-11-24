'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { id: 'beranda', label: 'Beranda', href: '/#beranda' },
  { id: 'layanan', label: 'Layanan Poli', href: '/#layanan' },
  { id: 'dokter', label: 'Direktori Dokter', href: '/#dokter' },
  { id: 'kontak', label: 'Hubungi Kami', href: '/#kontak' },
];

export default function Navbar({ user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('beranda');

  const isOnDashboard = pathname?.startsWith('/dashboard');
  const isOnProfile = pathname === '/profile';

  const dashboardHref =
    user?.role === 'admin'
      ? '/dashboard/admin'
      : user?.role === 'dokter'
      ? '/dashboard/dokter'
      : '/dashboard/pasien';

  // Deteksi section aktif otomatis saat halaman di-scroll
  useEffect(() => {
    if (pathname !== '/') {
      setActiveSection('');
      return;
    }

    function handleScroll() {
      const isAtBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 40;

      if (isAtBottom) {
        setActiveSection('kontak');
        return;
      }

      const scrollPosition = window.scrollY + 180;
      let current = 'beranda';

      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.id);
        if (el && el.offsetTop <= scrollPosition) {
          current = item.id;
        }
      }

      setActiveSection(current);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link
          href="/#beranda"
          onClick={() => setActiveSection('beranda')}
          className="flex items-center gap-3.5"
        >
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden">
            <img
              src="/guseocare-logo.ico"
              alt="Logo GuseoCare"
              className="h-full w-full scale-125 object-contain"
            />
          </div>
          <div>
            <span className="block text-lg font-bold tracking-tight text-slate-900">
              GuseoCare
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
              RS Pendidikan Universitas Guseo
            </span>
          </div>
        </Link>

        {/* Menu Navigasi dengan Indikator Aktif & Garis Bawah */}
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === '/' && activeSection === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setActiveSection(item.id)}
                className={`relative py-2 font-semibold transition-colors ${
                  isActive
                    ? 'text-teal-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-teal-600 transition-transform duration-200 ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              {isOnDashboard ? (
                <span className="hidden items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-2 text-sm font-semibold text-teal-900 sm:inline-flex">
                  <span className="h-2 w-2 rounded-full bg-teal-600" />
                  <span>
                    {user.name}{' '}
                    <span className="font-medium capitalize text-teal-700">
                      ({user.role})
                    </span>
                  </span>
                </span>
              ) : (
                <Link
                  href={dashboardHref}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  Dashboard ({user.role})
                </Link>
              )}

              <Link
                href="/profile"
                className={`rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
                  isOnProfile
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-teal-600 hover:text-teal-700'
                }`}
              >
                Profil
              </Link>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                {loading ? '...' : 'Keluar'}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Daftar Pasien
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}