import Link from 'next/link';

export default function DoctorCard({ doctor, isLoggedIn }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:border-teal-300 hover:bg-white">
      <div>
        <span className="inline-block rounded-md bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800">
          {doctor.poli_name}
        </span>
        <h3 className="mt-3 text-lg font-bold text-slate-900">{doctor.name}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
          {doctor.bio}
        </p>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Jadwal Praktik (30 Menit)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {doctor.schedules.map((sch) => (
              <span
                key={sch.sch_id}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {sch.day}, {String(sch.start_time).slice(0, 5)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Link
        href={isLoggedIn ? '/dashboard/pasien' : '/login'}
        className="mt-6 block w-full rounded-xl bg-slate-900 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-teal-600"
      >
        Pilih Jadwal Konsultasi
      </Link>
    </div>
  );
}