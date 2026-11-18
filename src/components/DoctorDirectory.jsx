'use client';

import { useState } from 'react';
import DoctorCard from '@/components/DoctorCard';

export default function DoctorDirectory({ doctors, polis, isLoggedIn }) {
  const [selectedPoli, setSelectedPoli] = useState('Semua');

  const filteredDoctors =
    selectedPoli === 'Semua'
      ? doctors
      : doctors.filter((doc) => doc.poli_name === selectedPoli);

  return (
    <div>
      {/* Header & Counter */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Tim Dokter & Profesor Klinis
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Jadwal praktik resmi dokter spesialis dan dokter umum RS Universitas Guseo.
          </p>
        </div>
        <span className="self-start rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-800 sm:self-auto">
          Menampilkan {filteredDoctors.length} dari {doctors.length} Dokter
        </span>
      </div>

      {/* Tombol Filter Poli (Solid Clinical Slate & Surgical Teal) */}
      <div className="mb-8 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setSelectedPoli('Semua')}
          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
            selectedPoli === 'Semua'
              ? 'bg-teal-600 text-white'
              : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-400 hover:bg-white'
          }`}
        >
          Semua Poli ({doctors.length})
        </button>

        {polis.map((poli) => {
          const count = doctors.filter((d) => d.poli_name === poli.name).length;
          const isActive = selectedPoli === poli.name;

          return (
            <button
              key={poli.poli_id}
              type="button"
              onClick={() => setSelectedPoli(poli.name)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-400 hover:bg-white'
              }`}
            >
              {poli.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid Kartu Dokter */}
      {filteredDoctors.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDoctors.map((doc) => (
            <DoctorCard key={doc.doctor_id} doctor={doc} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
          Tidak ada dokter aktif pada poliklinik ini.
        </div>
      )}
    </div>
  );
}