'use client';

import { useMemo } from 'react';

export default function AnalyticsReportTab({
  appointments = [],
  prescriptions = [],
  medicines = [],
  polis = [],
  users = [],
}) {
  // 1. Ringkasan KPI Utama
  const summary = useMemo(() => {
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(
      (a) => a.status === 'done'
    ).length;
    const activeAppointments = appointments.filter(
      (a) => a.status === 'pending' || a.status === 'approved'
    ).length;

    const uniquePatients = new Set(
      appointments.map((a) => a.patient_id).filter(Boolean)
    ).size;

    const totalDoctors = users.filter((u) => u.role === 'dokter').length;
    const totalRegisteredPatients = users.filter(
      (u) => u.role === 'pasien'
    ).length;

    let totalMedicineUnits = 0;
    prescriptions.forEach((prs) => {
      if (Array.isArray(prs.items)) {
        prs.items.forEach((item) => {
          totalMedicineUnits += Number(item.quantity || 0);
        });
      }
    });

    return {
      totalAppointments,
      completedAppointments,
      activeAppointments,
      uniquePatients,
      totalDoctors,
      totalRegisteredPatients,
      totalPrescriptions: prescriptions.length,
      totalMedicineUnits,
    };
  }, [appointments, prescriptions, users]);

  // 2. Laporan Jumlah Pasien & Kunjungan per Poliklinik
  const poliReport = useMemo(() => {
    const map = new Map();

    // Inisialisasi semua poli agar poli dengan 0 kunjungan tetap tampil
    polis.forEach((p) => {
      map.set(p.name, {
        poliName: p.name,
        totalVisits: 0,
        doneVisits: 0,
        patientSet: new Set(),
      });
    });

    appointments.forEach((apt) => {
      const name = apt.poli_name || 'Lainnya';
      if (!map.has(name)) {
        map.set(name, {
          poliName: name,
          totalVisits: 0,
          doneVisits: 0,
          patientSet: new Set(),
        });
      }
      const entry = map.get(name);
      entry.totalVisits += 1;
      if (apt.status === 'done') entry.doneVisits += 1;
      if (apt.patient_id) entry.patientSet.add(apt.patient_id);
    });

    const list = Array.from(map.values())
      .map((item) => ({
        poliName: item.poliName,
        totalVisits: item.totalVisits,
        doneVisits: item.doneVisits,
        uniquePatients: item.patientSet.size,
      }))
      .sort((a, b) => b.totalVisits - a.totalVisits);

    const maxVisits = Math.max(...list.map((i) => i.totalVisits), 1);
    return { list, maxVisits };
  }, [appointments, polis]);

  // 3. Laporan Kinerja Dokter
  const doctorReport = useMemo(() => {
    const map = new Map();

    appointments.forEach((apt) => {
      const key = apt.doctor_name || `Dokter #${apt.doctor_id}`;
      if (!map.has(key)) {
        map.set(key, {
          doctorName: key,
          poliName: apt.poli_name || '-',
          total: 0,
          done: 0,
          active: 0,
          cancelledOrRejected: 0,
        });
      }
      const entry = map.get(key);
      entry.total += 1;
      if (apt.status === 'done') {
        entry.done += 1;
      } else if (apt.status === 'pending' || apt.status === 'approved') {
        entry.active += 1;
      } else {
        entry.cancelledOrRejected += 1;
      }
    });

    return Array.from(map.values())
      .map((doc) => ({
        ...doc,
        completionRate:
          doc.total > 0 ? Math.round((doc.done / doc.total) * 100) : 0,
      }))
      .sort((a, b) => b.done - a.done || b.total - a.total);
  }, [appointments]);

  // 4. Laporan Penggunaan Obat
  const medicineReport = useMemo(() => {
    const stockMap = new Map(
      medicines.map((m) => [m.name, { stock: Number(m.stock || 0), type: m.type }])
    );
    const usageMap = new Map();

    prescriptions.forEach((prs) => {
      if (!Array.isArray(prs.items)) return;
      prs.items.forEach((item) => {
        const name = item.medicine_name || 'Obat Tidak Diketahui';
        if (!usageMap.has(name)) {
          const master = stockMap.get(name);
          usageMap.set(name, {
            name,
            type: item.medicine_type || master?.type || 'biasa',
            totalQty: 0,
            prescriptionCount: 0,
            currentStock:
              item.current_stock !== undefined
                ? Number(item.current_stock)
                : master?.stock ?? '-',
          });
        }
        const entry = usageMap.get(name);
        entry.totalQty += Number(item.quantity || 0);
        entry.prescriptionCount += 1;
      });
    });

    const list = Array.from(usageMap.values()).sort(
      (a, b) => b.totalQty - a.totalQty
    );
    const maxQty = Math.max(...list.map((i) => i.totalQty), 1);
    return { list, maxQty };
  }, [prescriptions, medicines]);

  return (
    <div className="space-y-8">
      {/* Header Bagian */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Laporan &amp; Analitik Operasional
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan jumlah pasien per poliklinik, kinerja pemeriksaan dokter,
            serta statistik penggunaan obat farmasi secara real-time.
          </p>
        </div>
      </div>

      {/* Kartu KPI Ringkasan */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Kunjungan
          </span>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {summary.totalAppointments}
          </p>
          <p className="mt-1 text-xs text-teal-700">
            {summary.completedAppointments} selesai • {summary.activeAppointments}{' '}
            aktif
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pasien Dilayani
          </span>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {summary.uniquePatients}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            dari {summary.totalRegisteredPatients} pasien terdaftar
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Obat Diresepkan
          </span>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {summary.totalMedicineUnits}
            <span className="ml-1 text-sm font-semibold text-slate-500">
              unit
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            dari {summary.totalPrescriptions} lembar resep
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Unit &amp; Tenaga Medis
          </span>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {polis.length}
            <span className="ml-1 text-sm font-semibold text-slate-500">
              poli
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.totalDoctors} dokter spesialis aktif
          </p>
        </div>
      </div>

      {/* Grid 2 Kolom: Pasien per Poli & Penggunaan Obat */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Jumlah Pasien per Poliklinik */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-bold text-slate-900">
            Jumlah Pasien &amp; Kunjungan per Poliklinik
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Distribusi kunjungan pasien berdasarkan unit poliklinik.
          </p>

          {poliReport.list.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              Belum ada data poliklinik.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {poliReport.list.map((item) => {
                const widthPct = Math.round(
                  (item.totalVisits / poliReport.maxVisits) * 100
                );
                return (
                  <div key={item.poliName} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {item.poliName}
                      </span>
                      <span className="text-slate-600">
                        <strong className="text-slate-900">
                          {item.totalVisits}
                        </strong>{' '}
                        kunjungan ({item.uniquePatients} pasien •{' '}
                        {item.doneVisits} selesai)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-600 transition-all duration-300"
                        style={{
                          width: `${item.totalVisits > 0 ? Math.max(widthPct, 6) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Penggunaan Obat Farmasi */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-base font-bold text-slate-900">
            Statistik Penggunaan Obat
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Obat yang paling sering diresepkan beserta sisa stok saat ini.
          </p>

          {medicineReport.list.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              Belum ada data penggunaan obat dari resep dokter.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {medicineReport.list.map((med) => {
                const widthPct = Math.round(
                  (med.totalQty / medicineReport.maxQty) * 100
                );
                return (
                  <div key={med.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {med.name}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${
                            med.type === 'keras'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {med.type}
                        </span>
                      </div>
                      <span className="text-slate-600">
                        <strong className="text-black">
                          {med.totalQty} unit
                        </strong>{' '}
                        ({med.prescriptionCount} resep • Sisa: {med.currentStock})
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-600 transition-all duration-300"
                        style={{ width: `${Math.max(widthPct, 6)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Tabel Kinerja Dokter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-base font-bold text-slate-900">
          Laporan Kinerja Dokter
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Rekapitulasi jumlah pasien yang ditangani dan tingkat penyelesaian
          konsultasi per dokter.
        </p>

        {doctorReport.length === 0 ? (
          <p className="mt-6 text-center text-sm text-slate-500">
            Belum ada data transaksi konsultasi dokter.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Nama Dokter</th>
                  <th className="px-4 py-3">Poliklinik</th>
                  <th className="px-4 py-3 text-center">Total Janji</th>
                  <th className="px-4 py-3 text-center">Selesai</th>
                  <th className="px-4 py-3 text-center">Aktif</th>
                  <th className="px-4 py-3 text-center">Batal / Tolak</th>
                  <th className="px-4 py-3">Tingkat Penyelesaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {doctorReport.map((doc) => (
                  <tr key={doc.doctorName} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {doc.doctorName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{doc.poliName}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      {doc.total}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-700">
                      {doc.done}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-amber-700">
                      {doc.active}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-rose-600">
                      {doc.cancelledOrRejected}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-600"
                            style={{ width: `${doc.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {doc.completionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}