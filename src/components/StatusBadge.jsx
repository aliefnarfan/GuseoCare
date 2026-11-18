const STATUS_CONFIG = {
  // Status Janji Temu (Appointments)
  pending: {
    label: 'Menunggu Konfirmasi',
    classes: 'border-amber-200 bg-amber-100 text-amber-800',
  },
  approved: {
    label: 'Disetujui / Terjadwal',
    classes: 'border-sky-200 bg-sky-100 text-sky-800',
  },
  done: {
    label: 'Selesai Diperiksa',
    classes: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  },
  rejected: {
    label: 'Ditolak',
    classes: 'border-rose-200 bg-rose-100 text-rose-800',
  },
  cancelled: {
    label: 'Dibatalkan Pasien',
    classes: 'border-slate-300 bg-slate-200 text-slate-700',
  },

  // Status Resep Obat (Prescriptions)
  'menunggu diproses': {
    label: 'Farmasi: Menunggu Diproses',
    classes: 'border-amber-200 bg-amber-100 text-amber-800',
  },
  'siap diambil': {
    label: 'Farmasi: Siap Diambil',
    classes: 'border-sky-200 bg-sky-100 text-sky-800',
  },
  'sudah diambil': {
    label: 'Farmasi: Sudah Diambil',
    classes: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  },
};

export default function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const config = STATUS_CONFIG[normalized] || {
    label: status || 'Tidak Diketahui',
    classes: 'border-slate-200 bg-slate-100 text-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${config.classes}`}
    >
      {config.label}
    </span>
  );
}