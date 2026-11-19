'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';

function formatDateID(dateInput) {
  if (!dateInput) return '-';
  const dateObj = new Date(dateInput);
  return dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function DoctorDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'records'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'history'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Modal Tolak Janji Temu
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Modal Pemeriksaan & Input Rekam Medis
  const [examTarget, setExamTarget] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [notes, setNotes] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [examError, setExamError] = useState('');
  const [savingExam, setSavingExam] = useState(false);

  async function loadDashboardData() {
    try {
      const [meRes, aptRes, recRes, medRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/appointments'),
        fetch('/api/medical-records'),
        fetch('/api/medicines'),
      ]);

      if (!meRes.ok) {
        router.push('/login');
        return;
      }

      const meData = await meRes.json();
      const currentUser = meData.user || meData;

      if (!currentUser || !currentUser.role) {
        router.push('/login');
        return;
      }

      if (currentUser.role !== 'dokter') {
        router.push(
          currentUser.role === 'admin' ? '/dashboard/admin' : '/dashboard/pasien'
        );
        return;
      }

      const aptData = aptRes.ok ? await aptRes.json() : { appointments: [] };
      const recData = recRes.ok ? await recRes.json() : { medical_records: [] };
      const medData = medRes.ok ? await medRes.json() : { medicines: [] };

      setUser(currentUser);
      setAppointments(aptData.appointments || []);
      setRecords(recData.medical_records || recData.records || []);
      setMedicines(
        medData.medicines || (Array.isArray(medData) ? medData : [])
      );
    } catch (err) {
      console.error('Gagal memuat data dashboard dokter:', err);
    } finally {
      setLoadingPage(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Pengurutan: Pending & Approved terdekat (ASC) di atas, Riwayat (DESC) di bawah
  const sortedAppointments = useMemo(() => {
    const isActive = (st) => st === 'pending' || st === 'approved';
    return [...appointments].sort((a, b) => {
      const aAct = isActive(a.status);
      const bAct = isActive(b.status);
      if (aAct !== bAct) return aAct ? -1 : 1;

      const dateA = new Date(a.booking_date || a.apt_date).getTime();
      const dateB = new Date(b.booking_date || b.apt_date).getTime();

      if (aAct && bAct) {
        if (dateA !== dateB) return dateA - dateB;
        return String(a.start_time).localeCompare(String(b.start_time));
      }
      if (dateA !== dateB) return dateB - dateA;
      return Number(b.apt_id) - Number(a.apt_id);
    });
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    if (statusFilter === 'pending') {
      return sortedAppointments.filter((a) => a.status === 'pending');
    }
    if (statusFilter === 'approved') {
      return sortedAppointments.filter((a) => a.status === 'approved');
    }
    if (statusFilter === 'history') {
      return sortedAppointments.filter(
        (a) => a.status === 'done' || a.status === 'rejected' || a.status === 'cancelled'
      );
    }
    return sortedAppointments;
  }, [sortedAppointments, statusFilter]);

  const pendingCount = appointments.filter((a) => a.status === 'pending').length;
  const approvedCount = appointments.filter((a) => a.status === 'approved').length;
  const doneCount = appointments.filter((a) => a.status === 'done').length;
  const historyCount = appointments.filter(
    (a) => a.status === 'done' || a.status === 'rejected' || a.status === 'cancelled'
  ).length;

  async function handleApprove(aptId) {
    setActionLoadingId(aptId);
    try {
      const res = await fetch(`/api/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (res.ok) {
        await loadDashboardData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Gagal menyetujui janji temu.');
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  function openRejectModal(apt) {
    setRejectTarget(apt);
    setRejectReason('');
    setRejectError('');
  }

  async function handleRejectSubmit(e) {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError('Alasan penolakan wajib diisi.');
      return;
    }

    setRejecting(true);
    setRejectError('');
    try {
      const res = await fetch(`/api/appointments/${rejectTarget.apt_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRejectError(data.error || 'Gagal menolak janji temu.');
        return;
      }

      setRejectTarget(null);
      await loadDashboardData();
    } catch {
      setRejectError('Terjadi kesalahan jaringan.');
    } finally {
      setRejecting(false);
    }
  }

  function openExamModal(apt) {
    setExamTarget(apt);
    setDiagnosis('');
    setActionTaken('');
    setNotes('');
    setPrescriptionItems([]);
    setExamError('');
  }

  function addMedicineRow() {
    setPrescriptionItems((prev) => [...prev, { med_id: '', quantity: 1 }]);
  }

  function updateMedicineRow(index, field, value) {
    setPrescriptionItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function removeMedicineRow(index) {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleExamSubmit(e) {
    e.preventDefault();
    if (!examTarget) return;
    setExamError('');

    if (!diagnosis.trim() || !actionTaken.trim()) {
      setExamError('Diagnosis medis dan tindakan klinis wajib diisi.');
      return;
    }

    const cleanedItems = prescriptionItems
      .filter((item) => item.med_id)
      .map((item) => ({
        med_id: Number(item.med_id),
        quantity: Number(item.quantity),
      }));

    if (cleanedItems.some((item) => !item.quantity || item.quantity <= 0)) {
      setExamError('Jumlah setiap obat yang diresepkan minimal 1 unit.');
      return;
    }

    setSavingExam(true);
    try {
      const res = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apt_id: Number(examTarget.apt_id),
          diagnosis: diagnosis.trim(),
          action: actionTaken.trim(),
          notes: notes.trim() || null,
          items: cleanedItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setExamError(data.error || 'Gagal menyimpan rekam medis.');
        return;
      }

      setExamTarget(null);
      await loadDashboardData();
    } catch {
      setExamError('Terjadi kesalahan jaringan saat menyimpan rekam medis.');
    } finally {
      setSavingExam(false);
    }
  }

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar user={user} />
        <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm font-medium text-slate-500">
          Memuat portal dokter GuseoCare...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar user={user} />

      {/* Header Portal Dokter */}
      <section className="border-b border-slate-800 bg-slate-900 py-10 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                Portal Praktik Dokter
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Selamat Bertugas, {user?.name}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Konfirmasi pengajuan janji temu, lakukan pemeriksaan klinis, dan terbitkan
                resep obat ke instalasi farmasi.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:flex">
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                <span className="block text-xs font-medium text-slate-400">
                  Menunggu
                </span>
                <span className="mt-0.5 block text-2xl font-bold text-amber-400">
                  {pendingCount}
                </span>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                <span className="block text-xs font-medium text-slate-400">
                  Siap Diperiksa
                </span>
                <span className="mt-0.5 block text-2xl font-bold text-sky-400">
                  {approvedCount}
                </span>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                <span className="block text-xs font-medium text-slate-400">
                  Selesai
                </span>
                <span className="mt-0.5 block text-2xl font-bold text-teal-400">
                  {doneCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sub-Navigasi Tab */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {[
            { id: 'queue', label: `Antrean & Konfirmasi (${appointments.length})` },
            { id: 'records', label: `Riwayat Pemeriksaan (${records.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative whitespace-nowrap py-4 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'text-teal-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 transition-transform duration-200 ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Konten Utama */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* TAB 1: ANTREAN & KONFIRMASI */}
        {activeTab === 'queue' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Daftar Antrean Pasien
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Setujui jadwal masuk, lalu klik &ldquo;Periksa &amp; Input Rekam Medis&rdquo;
                saat pasien hadir berkonsultasi.
              </p>
            </div>

            {/* Filter Pill Status */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: `Semua (${appointments.length})` },
                { id: 'pending', label: `Menunggu Konfirmasi (${pendingCount})` },
                { id: 'approved', label: `Siap Diperiksa (${approvedCount})` },
                { id: 'history', label: `Selesai / Batal (${historyCount})` },
              ].map((pill) => {
                const isPillActive = statusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStatusFilter(pill.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      isPillActive
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            {visibleAppointments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
                Tidak ada antrean pasien pada kategori ini.
              </div>
            ) : (
              <div className="grid gap-4">
                {visibleAppointments.map((apt) => (
                  <div
                    key={apt.apt_id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 md:flex-row md:items-center"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                          #{apt.apt_id}
                        </span>
                        <StatusBadge status={apt.status} />
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        Pasien: {apt.patient_name}
                      </h3>

                      <p className="text-sm font-medium text-slate-700">
                        Jadwal: {formatDateID(apt.booking_date || apt.apt_date)} • Pukul{' '}
                        {String(apt.start_time).slice(0, 5)} WITA ({apt.duration} menit)
                      </p>

                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">Keluhan:</span>{' '}
                        {apt.complaint}
                      </p>

                      {apt.status === 'rejected' &&
                        (apt.rejection_reason || apt.reject_reason) && (
                          <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-800">
                            <strong>Alasan Penolakan:</strong>{' '}
                            {apt.rejection_reason || apt.reject_reason}
                          </div>
                        )}
                    </div>

                    {/* Tombol Aksi Dokter */}
                    <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                      {apt.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoadingId === apt.apt_id}
                            onClick={() => handleApprove(apt.apt_id)}
                            className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                          >
                            {actionLoadingId === apt.apt_id
                              ? 'Memproses...'
                              : 'Setujui Jadwal'}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === apt.apt_id}
                            onClick={() => openRejectModal(apt)}
                            className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                          >
                            Tolak
                          </button>
                        </>
                      )}

                      {apt.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => openExamModal(apt)}
                          className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700"
                        >
                          Periksa &amp; Input Rekam Medis
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RIWAYAT PEMERIKSAAN */}
        {activeTab === 'records' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Riwayat Rekam Medis Pasien
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Daftar hasil pemeriksaan dan resep obat yang telah Anda terbitkan.
              </p>
            </div>

            {records.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
                Belum ada riwayat pemeriksaan yang tercatat.
              </div>
            ) : (
              <div className="grid gap-6">
                {records.map((rec) => (
                  <div
                    key={rec.mr_id}
                    className="rounded-2xl border border-slate-200 bg-white p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                          Janji #{rec.apt_id} • {formatDateID(rec.booking_date)}
                        </span>
                        <h3 className="mt-1 text-lg font-bold text-slate-900">
                          Pasien: {rec.patient_name}
                        </h3>
                      </div>

                      {rec.prs_id && rec.prescription_status && (
                        <StatusBadge status={rec.prescription_status} />
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Diagnosis Medis
                        </span>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {rec.diagnosis}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Tindakan Klinis
                        </span>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {rec.action || '-'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Catatan &amp; Anjuran
                        </span>
                        <p className="mt-1 text-sm text-slate-700">
                          {rec.notes || '-'}
                        </p>
                      </div>
                    </div>

                    {rec.prs_id &&
                      Array.isArray(rec.prescription_items) &&
                      rec.prescription_items.length > 0 && (
                        <div className="mt-5 border-t border-slate-200 pt-4">
                          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                            Resep Obat Diterbitkan (No. Resep #{rec.prs_id})
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                                <tr>
                                  <th className="px-4 py-2.5">Nama Obat</th>
                                  <th className="px-4 py-2.5">Kategori</th>
                                  <th className="px-4 py-2.5">Jumlah</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {rec.prescription_items.map((item, idx) => (
                                  <tr key={item.prsi_id || idx}>
                                    <td className="px-4 py-3 font-semibold text-slate-900">
                                      {item.medicine_name}
                                    </td>
                                    <td className="px-4 py-3 capitalize text-slate-700">
                                      {item.medicine_type}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                      {item.quantity} unit
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL TOLAK JANJI TEMU */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Tolak Janji Temu #{rejectTarget.apt_id}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Pasien: <strong className="text-slate-800">{rejectTarget.patient_name}</strong>{' '}
              • {formatDateID(rejectTarget.booking_date || rejectTarget.apt_date)}
            </p>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-4">
              {rejectError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                  {rejectError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Alasan Penolakan <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Jadwal dokter dialihkan untuk tindakan operasi darurat..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={rejecting}
                  onClick={() => setRejectTarget(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {rejecting ? 'Mengirim...' : 'Konfirmasi Penolakan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PEMERIKSAAN & INPUT REKAM MEDIS + RESEP */}
      {examTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  Pemeriksaan Klinis • Janji #{examTarget.apt_id}
                </span>
                <h3 className="mt-0.5 text-lg font-bold text-slate-900">
                  Pasien: {examTarget.patient_name}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  <strong>Keluhan:</strong> {examTarget.complaint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExamTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExamSubmit} className="mt-5 space-y-4">
              {examError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                  {examError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Diagnosis Medis <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Contoh: ISPA Akut / Hipertensi Derajat 1"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tindakan Klinis <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="Contoh: Pemeriksaan fisik, pengukuran tekanan darah, dan pemberian terapi oral"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Catatan &amp; Anjuran Dokter (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Istirahat cukup, minum air hangat, kontrol kembali dalam 5 hari"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              {/* Resep Obat Dinamis */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Resep Obat Farmasi (Opsional)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tambahkan obat jika pasien memerlukan penebusan resep di farmasi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addMedicineRow}
                    className="rounded-lg border border-teal-600 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
                  >
                    + Tambah Obat
                  </button>
                </div>

                {prescriptionItems.length > 0 && (
                  <div className="mt-3 space-y-2.5">
                    {prescriptionItems.map((row, idx) => (
                      <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                        <select
                          required
                          value={row.med_id}
                          onChange={(e) =>
                            updateMedicineRow(idx, 'med_id', e.target.value)
                          }
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                        >
                          <option value="">-- Pilih Obat --</option>
                          {medicines.map((med) => (
                            <option key={med.med_id} value={med.med_id}>
                              {med.name} ({med.type}) — Stok: {med.stock}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            required
                            value={row.quantity}
                            onChange={(e) =>
                              updateMedicineRow(idx, 'quantity', e.target.value)
                            }
                            className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                            placeholder="Qty"
                          />
                          <button
                            type="button"
                            onClick={() => removeMedicineRow(idx)}
                            className="rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  disabled={savingExam}
                  onClick={() => setExamTarget(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingExam}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingExam
                    ? 'Menyimpan...'
                    : 'Simpan Rekam Medis & Selesaikan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}