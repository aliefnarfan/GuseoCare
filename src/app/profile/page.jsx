'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

function formatDateID(dateInput) {
  if (!dateInput) return '-';
  return new Date(dateInput).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // State Edit Profil
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({
    type: '',
    message: '',
  });

  // State Ubah Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({
    type: '',
    message: '',
  });

  async function loadProfile() {
    try {
      const res = await fetch('/api/profiles');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (res.ok && data.profile) {
        setProfile(data.profile);
        setName(data.profile.name || '');
        setEmail(data.profile.email || '');
        setBio(data.profile.bio || '');
      }
    } catch (err) {
      console.error('Gagal memuat profil:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileFeedback({ type: '', message: '' });

    if (!name.trim() || !email.trim()) {
      setProfileFeedback({
        type: 'error',
        message: 'Nama lengkap dan email wajib diisi.',
      });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch('/api/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          bio: profile?.role === 'dokter' ? bio.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileFeedback({
          type: 'error',
          message: data.error || 'Gagal memperbarui profil.',
        });
        return;
      }

      setProfileFeedback({
        type: 'success',
        message: data.message || 'Profil berhasil diperbarui.',
      });
      await loadProfile();
    } catch {
      setProfileFeedback({
        type: 'error',
        message: 'Terjadi kesalahan jaringan.',
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordFeedback({ type: '', message: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'Semua kolom kata sandi wajib diisi.',
      });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({
        type: 'error',
        message: 'Kata sandi baru minimal 6 karakter.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'Konfirmasi kata sandi baru tidak cocok.',
      });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordFeedback({
          type: 'error',
          message: data.error || 'Gagal mengubah kata sandi.',
        });
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({
        type: 'success',
        message: data.message || 'Kata sandi berhasil diperbarui.',
      });
    } catch {
      setPasswordFeedback({
        type: 'error',
        message: 'Terjadi kesalahan jaringan.',
      });
    } finally {
      setSavingPassword(false);
    }
  }

  const dashboardHref =
    profile?.role === 'admin'
      ? '/dashboard/admin'
      : profile?.role === 'dokter'
      ? '/dashboard/dokter'
      : '/dashboard/pasien';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar user={profile} />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center text-sm text-slate-500">
          Memuat informasi profil...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar user={profile} />

      <section className="border-b border-slate-800 bg-slate-900 py-10 text-white">
        <div className="mx-auto flex max-w-4xl flex-col justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
              Manajemen Akun &amp; Profil
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              {profile?.name}
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Peran:{' '}
              <strong className="capitalize text-teal-300">
                {profile?.role}
              </strong>
              {profile?.role === 'dokter' && profile?.poli_name
                ? ` • ${profile.poli_name}`
                : ''}{' '}
              • Terdaftar sejak {formatDateID(profile?.created_at)}
            </p>
          </div>
          <Link
            href={dashboardHref}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:border-teal-500 hover:text-teal-300"
          >
            ← Kembali ke Dashboard
          </Link>
        </div>
      </section>

      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2">
        {/* Form Edit Informasi Pribadi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Informasi Pribadi
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Perbarui nama lengkap, alamat email
            {profile?.role === 'dokter' ? ', dan bio spesialisasi Anda' : ''}.
          </p>

          <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
            {profileFeedback.message && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                  profileFeedback.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {profileFeedback.message}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Nama Lengkap <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>

            {profile?.role === 'dokter' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Unit Poliklinik
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={profile?.poli_name || '-'}
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Bio / Profil Spesialisasi
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tuliskan latar belakang atau keahlian klinis Anda..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
            </button>
          </form>
        </div>

        {/* Form Ubah Kata Sandi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">Keamanan Akun</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Ubah kata sandi akun Anda secara berkala untuk menjaga keamanan data.
          </p>

          <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
            {passwordFeedback.message && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                  passwordFeedback.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {passwordFeedback.message}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Kata Sandi Saat Ini <span className="text-rose-600">*</span>
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Kata Sandi Baru <span className="text-rose-600">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Konfirmasi Kata Sandi Baru{' '}
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {savingPassword ? 'Memperbarui...' : 'Perbarui Kata Sandi'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}