import Link from 'next/link';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import Navbar from '@/components/Navbar';
import DoctorDirectory from '@/components/DoctorDirectory';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  const [polisRes, doctorsRes] = await Promise.all([
    pool.query('SELECT poli_id, name, "desc" FROM polis ORDER BY poli_id ASC'),
    pool.query(`
      SELECT 
        dp.doctor_id,
        u.name,
        dp.bio,
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
      GROUP BY dp.doctor_id, u.user_id, p.poli_id
      ORDER BY dp.doctor_id ASC
    `),
  ]);

  const polis = polisRes.rows;
  const doctors = doctorsRes.rows;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar user={user} />

      {/* Hero Section Full-Viewport dengan Foto Rumah Sakit Blur & Overlay Solid */}
      <section
        id="beranda"
        className="relative flex min-h-[calc(100vh-73px)] scroll-mt-20 items-center overflow-hidden bg-slate-900 py-20 text-white"
      >
        {/* Layer Foto Rumah Sakit Blur */}
        <img
          src="/hospital-bg.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-105 object-cover blur-sm"
        />
        {/* Layer Overlay Gelap Solid Lebih Transparan (Tanpa Gradasi) */}
        <div aria-hidden="true" className="absolute inset-0 bg-slate-900/55" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="inline-block rounded-md border border-slate-400 bg-slate-950 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-white">
              Rumah Sakit Pendidikan Universitas Guseo
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Layanan Kesehatan Terpadu & Konsultasi Dokter Spesialis
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-100 sm:text-lg">
              Jadwalkan konsultasi dengan dokter spesialis pilihan Anda tanpa antre panjang,
              pantau riwayat pemeriksaan medis, dan tebus resep obat secara mudah dalam
              satu portal pasien.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href={user ? '/dashboard/pasien' : '/login'}
                className="rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Buat Janji Temu Sekarang
              </Link>
              <a
                href="#dokter"
                className="rounded-xl border border-slate-400 bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-slate-800"
              >
                Lihat Jadwal Dokter
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Poli Services Section */}
      <section id="layanan" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Departemen & Poliklinik Spesialis
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Unit pelayanan klinis utama Rumah Sakit Pendidikan Universitas Guseo.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {polis.map((poli) => (
            <div
              key={poli.poli_id}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-teal-500"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 font-bold text-teal-700">
                0{poli.poli_id}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{poli.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {poli.desc || 'Pelayanan konsultasi dan tindakan medis komprehensif.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Doctors Directory Section dengan Tombol Filter Poli */}
      <section id="dokter" className="scroll-mt-20 border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <DoctorDirectory
            doctors={doctors}
            polis={polis}
            isLoggedIn={Boolean(user)}
          />
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-900 py-8 text-center text-xs text-slate-400">
        © 2026 GuseoCare — Sistem Informasi Manajemen Rumah Sakit Universitas Guseo.
      </footer>
    </div>
  );
}