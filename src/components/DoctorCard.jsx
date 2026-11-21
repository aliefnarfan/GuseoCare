'use client';

import { useState } from 'react';
import Link from 'next/link';

function getInitials(name = '') {
  const cleaned = name
    .replace(/^(dr\.?|drg\.?|prof\.?)\s+/i, '')
    .split(',')[0]
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DoctorCard({ doctor, isLoggedIn }) {
  const [imgError, setImgError] = useState(false);

  // Gunakan doctor.photo_url jika ada di DB, jika tidak pakai /doctors/doctor-{id}.jpg
  const photoSrc = `/doctors/${doctor.doctor_id}.jpg`;

  // Ringkas hari praktik untuk baris "Tersedia :"
  const availableDays = Array.isArray(doctor.schedules)
    ? Array.from(new Set(doctor.schedules.map((s) => s.day)))
    : [];

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition duration-200 hover:border-teal-300 hover:shadow-md">
      <div>
        {/* Bagian Atas: Foto Lingkaran + Identitas Dokter */}
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {!imgError ? (
              <img
                src={photoSrc}
                alt={doctor.name}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-teal-50 text-sm font-bold text-teal-700">
                {getInitials(doctor.name)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-400">
              Kunjungi Rumah Sakit
            </p>
            <h3 className="mt-0.5 text-base font-bold leading-snug text-slate-900">
              {doctor.name}
            </h3>
            <p className="mt-1 text-xs font-semibold text-teal-700">
              {doctor.poli_name}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
              {doctor.bio}
            </p>
          </div>
        </div>

        {/* Garis Pemisah & Info Lokasi + Ketersediaan */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-400">
            RS Pendidikan Universitas Guseo
          </p>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5 text-xs">
            <span className="text-slate-400">Tersedia :</span>
            <span className="font-semibold text-slate-800">
              {availableDays.length > 0
                ? availableDays.join(', ')
                : 'Belum ada jadwal'}
            </span>
          </div>

          {Array.isArray(doctor.schedules) && doctor.schedules.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {doctor.schedules.map((sch) => (
                <span
                  key={sch.sch_id}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                >
                  {sch.day}, {String(sch.start_time).slice(0, 5)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tombol CTA Penuh */}
      <Link
        href={isLoggedIn ? '/dashboard/pasien' : '/login'}
        className="mt-6 block w-full rounded-xl bg-slate-900 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-600"
      >
        Pilih Jadwal & Buat Janji
      </Link>
    </div>
  );
}