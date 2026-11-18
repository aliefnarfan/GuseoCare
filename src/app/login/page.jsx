'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Gagal masuk ke sistem.');
        setLoading(false);
        return;
      }

      const role = data.user?.role || data.role;
      if (role === 'admin') router.push('/dashboard/admin');
      else if (role === 'dokter') router.push('/dashboard/dokter');
      else router.push('/dashboard/pasien');

      router.refresh();
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan jaringan.');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4 py-12">
      {/* Background Foto Rumah Sakit Blur */}
      <img
        src="/hospital-bg.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-105 object-cover blur-sm"
      />
      {/* Overlay Gelap Solid Lebih Transparan (Tanpa Gradasi) */}
      <div aria-hidden="true" className="absolute inset-0 bg-slate-900/50" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="mx-auto mb-3 inline-flex items-center justify-center">
            <img
              src="/guseocare-logo.ico"
              alt="Logo GuseoCare"
              className="h-16 w-16 scale-125 object-contain"
            />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Masuk ke GuseoCare
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Portal Pasien, Dokter & Administrasi RS Universitas Guseo
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Email Institusi / Pasien
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@guseocare.id"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Belum punya akun pasien?{' '}
          <Link href="/register" className="font-semibold text-teal-600 hover:underline">
            Daftar sekarang
          </Link>
        </p>

        {/* Tautan Kembali ke Beranda */}
        <div className="mt-5 border-t border-slate-100 pt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-teal-600"
          >
            <span>&larr;</span>
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    </div>
  );
}