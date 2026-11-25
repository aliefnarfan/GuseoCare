'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import UserManagementTab from '@/components/admin/UserManagementTab';
import PoliManagementTab from '@/components/admin/PoliManagementTab';
import AnalyticsReportTab from '@/components/admin/AnalyticsReportTab';

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

export default function AdminDashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [polis, setPolis] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);

  const [activeTab, setActiveTab] = useState('prescriptions');

  // Filter states
  const [prsFilter, setPrsFilter] = useState('all');
  const [aptFilter, setAptFilter] = useState('all');
  const [medSearch, setMedSearch] = useState('');
  const [medStockFilter, setMedStockFilter] = useState('all'); 
  const [medSort, setMedSort] = useState('name-asc'); 

  // Action states Resep
  const [processingPrsId, setProcessingPrsId] = useState(null);
  const [prsFeedback, setPrsFeedback] = useState({ type: '', message: '' });

  // Action states Obat
  const [medFeedback, setMedFeedback] = useState({ type: '', message: '' });
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [medName, setMedName] = useState('');
  const [medDesc, setMedDesc] = useState('');
  const [medType, setMedType] = useState('biasa');
  const [medStock, setMedStock] = useState(0);
  const [medError, setMedError] = useState('');
  const [savingMed, setSavingMed] = useState(false);
  const [deleteMedTarget, setDeleteMedTarget] = useState(null);
  const [deletingMedId, setDeletingMedId] = useState(null);

  // Action states Janji Temu (Approve / Reject Admin)
  const [aptFeedback, setAptFeedback] = useState({ type: '', message: '' });
  const [processingAptId, setProcessingAptId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejecting, setRejecting] = useState(false);

  async function loadDashboardData() {
    try {
      const [meRes, prsRes, medRes, aptRes, usersRes, polisRes] =
        await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/prescriptions'),
          fetch('/api/medicines'),
          fetch('/api/appointments'),
          fetch('/api/users'),
          fetch('/api/polis'),
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

      if (currentUser.role !== 'admin') {
        router.push(
          currentUser.role === 'dokter' ? '/dashboard/dokter' : '/dashboard/pasien'
        );
        return;
      }

      const prsData = prsRes.ok ? await prsRes.json() : { prescriptions: [] };
      const medData = medRes.ok ? await medRes.json() : { medicines: [] };
      const aptData = aptRes.ok ? await aptRes.json() : { appointments: [] };
      const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
      const polisData = polisRes.ok ? await polisRes.json() : { polis: [] };

      setUser(currentUser);
      setPrescriptions(prsData.prescriptions || []);
      setMedicines(medData.medicines || []);
      setAppointments(aptData.appointments || []);
      setUsers(usersData.users || []);
      setPolis(polisData.polis || []);
    } catch (err) {
      console.error('Gagal memuat data dashboard admin:', err);
    } finally {
      setLoadingPage(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Statistik Header
  const waitingPrsCount = prescriptions.filter(
    (p) => p.status === 'menunggu diproses'
  ).length;
  const readyPrsCount = prescriptions.filter(
    (p) => p.status === 'siap diambil'
  ).length;
  const completedPrsCount = prescriptions.filter(
    (p) => p.status === 'sudah diambil'
  ).length;
  const pendingAptCount = appointments.filter(
    (a) => a.status === 'pending'
  ).length;
  const availableMedCount = medicines.filter((m) => Number(m.stock) > 0).length;
  const lowStockCount = medicines.filter(
    (m) => Number(m.stock) > 0 && Number(m.stock) <= 10
  ).length;
  const emptyMedCount = medicines.filter((m) => Number(m.stock) === 0).length;

  // Filter Resep
  const visiblePrescriptions = useMemo(() => {
    if (prsFilter === 'all') return prescriptions;
    return prescriptions.filter((p) => p.status === prsFilter);
  }, [prescriptions, prsFilter]);

  // Filter Obat (Pencarian + Status Stok)
  const visibleMedicines = useMemo(() => {
  const q = medSearch.trim().toLowerCase();
  const filtered = medicines.filter((m) => {
    const stock = Number(m.stock);
    if (medStockFilter === 'available' && stock <= 0) return false;
    if (medStockFilter === 'low' && (stock <= 0 || stock > 10)) return false;
    if (medStockFilter === 'empty' && stock !== 0) return false;

    if (q) {
      return (
        m.name.toLowerCase().includes(q) ||
        String(m.desc || '').toLowerCase().includes(q) ||
        String(m.type || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (medSort === 'name-asc') {
      return String(a.name || '').localeCompare(String(b.name || ''), 'id');
    }
    if (medSort === 'name-desc') {
      return String(b.name || '').localeCompare(String(a.name || ''), 'id');
    }
    if (medSort === 'stock-asc') {
      return Number(a.stock) - Number(b.stock);
    }
    return Number(b.stock) - Number(a.stock);
  });
}, [medicines, medSearch, medStockFilter, medSort]);

  // Filter Janji Temu
  const visibleAppointments = useMemo(() => {
    if (aptFilter === 'all') return appointments;
    if (aptFilter === 'closed') {
      return appointments.filter(
        (a) => a.status === 'rejected' || a.status === 'cancelled'
      );
    }
    return appointments.filter((a) => a.status === aptFilter);
  }, [appointments, aptFilter]);

  // Handler Update Status Resep Farmasi
  async function handleUpdatePrescriptionStatus(prsId, nextStatus) {
    setProcessingPrsId(prsId);
    setPrsFeedback({ type: '', message: '' });
    try {
      const res = await fetch(`/api/prescriptions/${prsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPrsFeedback({
          type: 'error',
          message: data.error || 'Gagal memperbarui status resep.',
        });
        return;
      }

      setPrsFeedback({
        type: 'success',
        message:
          data.message || `Resep #${prsId} berhasil diubah menjadi "${nextStatus}".`,
      });
      await loadDashboardData();
    } catch {
      setPrsFeedback({
        type: 'error',
        message: 'Terjadi kesalahan jaringan saat memproses resep.',
      });
    } finally {
      setProcessingPrsId(null);
    }
  }

  // Modal Obat Handlers
  function openAddMedicineModal() {
    setEditingMed(null);
    setMedName('');
    setMedDesc('');
    setMedType('biasa');
    setMedStock(10);
    setMedError('');
    setMedModalOpen(true);
  }

  function openEditMedicineModal(med) {
    setEditingMed(med);
    setMedName(med.name || '');
    setMedDesc(med.desc || '');
    setMedType(med.type || 'biasa');
    setMedStock(Number(med.stock ?? 0));
    setMedError('');
    setMedModalOpen(true);
  }

  async function handleSaveMedicine(e) {
    e.preventDefault();
    setMedError('');

    if (!medName.trim()) {
      setMedError('Nama obat wajib diisi.');
      return;
    }

    const numericStock = Number(medStock);
    if (Number.isNaN(numericStock) || numericStock < 0) {
      setMedError('Stok obat harus berupa angka minimal 0.');
      return;
    }

    setSavingMed(true);
    try {
      const url = editingMed
        ? `/api/medicines/${editingMed.med_id}`
        : '/api/medicines';
      const method = editingMed ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: medName.trim(),
          desc: medDesc.trim() || null,
          type: medType,
          stock: numericStock,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMedError(data.error || 'Gagal menyimpan data obat.');
        return;
      }

      setMedModalOpen(false);
      setMedFeedback({
        type: 'success',
        message: data.message || 'Data obat berhasil disimpan.',
      });
      await loadDashboardData();
    } catch {
      setMedError('Terjadi kesalahan jaringan saat menyimpan obat.');
    } finally {
      setSavingMed(false);
    }
  }

  async function handleConfirmDeleteMedicine() {
    if (!deleteMedTarget) return;
    setDeletingMedId(deleteMedTarget.med_id);
    setMedFeedback({ type: '', message: '' });
    try {
      const res = await fetch(`/api/medicines/${deleteMedTarget.med_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setMedFeedback({
          type: 'error',
          message: data.error || 'Gagal menghapus obat.',
        });
        return;
      }
      setMedFeedback({
        type: 'success',
        message: data.message || 'Obat berhasil dihapus.',
      });
      await loadDashboardData();
    } catch {
      setMedFeedback({ type: 'error', message: 'Terjadi kesalahan jaringan.' });
    } finally {
      setDeletingMedId(null);
      setDeleteMedTarget(null);
    }
  }

  // Handler Approve / Reject Janji Temu oleh Admin
  async function handleApproveAppointment(aptId) {
    setProcessingAptId(aptId);
    setAptFeedback({ type: '', message: '' });
    try {
      const res = await fetch(`/api/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAptFeedback({
          type: 'error',
          message: data.error || 'Gagal menyetujui janji temu.',
        });
        return;
      }
      setAptFeedback({
        type: 'success',
        message: `Janji temu #${aptId} berhasil disetujui.`,
      });
      await loadDashboardData();
    } catch {
      setAptFeedback({ type: 'error', message: 'Terjadi kesalahan jaringan.' });
    } finally {
      setProcessingAptId(null);
    }
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
      setAptFeedback({
        type: 'success',
        message: `Janji temu #${rejectTarget.apt_id} berhasil ditolak.`,
      });
      setRejectTarget(null);
      await loadDashboardData();
    } catch {
      setRejectError('Terjadi kesalahan jaringan.');
    } finally {
      setRejecting(false);
    }
  }

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar user={user} />
        <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm font-medium text-slate-500">
          Memuat portal admin &amp; farmasi GuseoCare...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar user={user} />

      {/* Header Portal Admin & Farmasi */}
      <section className="border-b border-slate-800 bg-slate-900 py-10 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                Portal Administrasi &amp; Instalasi Farmasi
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Dashboard Operasional, {user?.name}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Kelola antrean penyiapan resep dokter, inventaris stok obat farmasi,
                pengguna, poliklinik, dan verifikasi janji temu rumah sakit.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                <span className="block text-xs font-medium text-slate-400">
                  Janji Pending
                </span>
                <span className="mt-0.5 block text-2xl font-bold text-amber-400">
                  {pendingAptCount}
                </span>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                <span className="block text-xs font-medium text-slate-400">
                  Resep Menunggu
                </span>
                <span className="mt-0.5 block text-2xl font-bold text-sky-400">
                  {waitingPrsCount}
                </span>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                <span className="block text-xs font-medium text-slate-400">
                  Siap Diambil
                </span>
                <span className="mt-0.5 block text-2xl font-bold text-teal-400">
                  {readyPrsCount}
                </span>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                <span className="block text-xs font-medium text-slate-400">
                  Total Pengguna
                </span>
                <span className="mt-0.5 block text-2xl font-bold text-white">
                  {users.length}
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
            {
              id: 'prescriptions',
              label: `Antrean Resep Farmasi (${prescriptions.length})`,
            },
            {
              id: 'medicines',
              label: `Manajemen Stok Obat (${medicines.length})`,
            },
            {
              id: 'appointments',
              label: `Verifikasi & Monitoring Janji (${appointments.length})`,
            },
            {
              id: 'users',
              label: `Manajemen Pengguna (${users.length})`,
            },
            {
              id: 'polis',
              label: `Manajemen Poli (${polis.length})`,
            },
            { 
              id: 'analytics', 
              label: 'Laporan & Analitik' 
            },
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
        {/* TAB 1: ANTREAN RESEP FARMASI */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Antrean Penyiapan Resep Farmasi
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Stok obat akan otomatis terpotong saat resep diproses dari
                &ldquo;Menunggu Diproses&rdquo; menjadi &ldquo;Siap Diambil&rdquo;.
              </p>
            </div>

            {prsFeedback.message && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  prsFeedback.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {prsFeedback.message}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: `Semua (${prescriptions.length})` },
                {
                  id: 'menunggu diproses',
                  label: `Menunggu Diproses (${waitingPrsCount})`,
                },
                { id: 'siap diambil', label: `Siap Diambil (${readyPrsCount})` },
                {
                  id: 'sudah diambil',
                  label: `Sudah Diambil (${completedPrsCount})`,
                },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setPrsFilter(pill.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    prsFilter === pill.id
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {visiblePrescriptions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
                Tidak ada data resep pada kategori ini.
              </div>
            ) : (
              <div className="grid gap-5">
                {visiblePrescriptions.map((prs) => {
                  const hasStockIssue =
                    prs.status === 'menunggu diproses' &&
                    Array.isArray(prs.items) &&
                    prs.items.some(
                      (item) => Number(item.current_stock) < Number(item.quantity)
                    );

                  return (
                    <div
                      key={prs.prs_id}
                      className="rounded-2xl border border-slate-200 bg-white p-6"
                    >
                      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                              Resep #{prs.prs_id}
                            </span>
                            <StatusBadge status={prs.status} />
                          </div>
                          <h3 className="mt-2 text-lg font-bold text-slate-900">
                            Pasien: {prs.patient_name}
                          </h3>
                          <p className="text-xs text-slate-600">
                            Dokter: <strong>{prs.doctor_name}</strong> • Diagnosis:{' '}
                            <strong>{prs.diagnosis}</strong>
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                          {prs.status === 'menunggu diproses' && (
                            <button
                              type="button"
                              disabled={processingPrsId === prs.prs_id}
                              onClick={() =>
                                handleUpdatePrescriptionStatus(
                                  prs.prs_id,
                                  'siap diambil'
                                )
                              }
                              className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                            >
                              {processingPrsId === prs.prs_id
                                ? 'Memproses...'
                                : 'Proses & Siapkan Obat'}
                            </button>
                          )}

                          {prs.status === 'siap diambil' && (
                            <button
                              type="button"
                              disabled={processingPrsId === prs.prs_id}
                              onClick={() =>
                                handleUpdatePrescriptionStatus(
                                  prs.prs_id,
                                  'sudah diambil'
                                )
                              }
                              className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                            >
                              {processingPrsId === prs.prs_id
                                ? 'Memproses...'
                                : 'Tandai Sudah Diambil'}
                            </button>
                          )}
                        </div>
                      </div>

                      {hasStockIssue && (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                          <strong>Perhatian:</strong> Salah satu obat pada resep ini
                          memiliki stok lebih sedikit dari jumlah permintaan. Lakukan
                          restok di tab <strong>Manajemen Stok Obat</strong> terlebih
                          dahulu.
                        </div>
                      )}

                      {Array.isArray(prs.items) && prs.items.length > 0 && (
                        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                              <tr>
                                <th className="px-4 py-2.5">Nama Obat</th>
                                <th className="px-4 py-2.5">Kategori</th>
                                <th className="px-4 py-2.5">Jumlah Resep</th>
                                <th className="px-4 py-2.5">Stok Gudang</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {prs.items.map((item, idx) => {
                                const insufficient =
                                  prs.status === 'menunggu diproses' &&
                                  Number(item.current_stock) < Number(item.quantity);
                                return (
                                  <tr key={item.prsi_id || idx}>
                                    <td className="px-4 py-3 font-semibold text-slate-900">
                                      {item.medicine_name}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${
                                          item.medicine_type === 'keras'
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                      >
                                        {item.medicine_type}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                      {item.quantity} unit
                                    </td>
                                    <td
                                      className={`px-4 py-3 font-semibold ${
                                        insufficient
                                          ? 'text-rose-600'
                                          : 'text-slate-700'
                                      }`}
                                    >
                                      {item.current_stock} unit
                                      {insufficient && ' (Kurang)'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANAJEMEN STOK OBAT */}
        {activeTab === 'medicines' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Inventaris &amp; Stok Obat Farmasi
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Tambah katalog obat baru, perbarui stok, atau hapus obat yang sudah
                  tidak digunakan.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddMedicineModal}
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                + Tambah Obat Baru
              </button>
            </div>

            {medFeedback.message && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  medFeedback.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {medFeedback.message}
              </div>
            )}

            {/* Filter Status Stok & Pencarian */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: `Semua (${medicines.length})` },
                  { id: 'available', label: `Tersedia (${availableMedCount})` },
                  { id: 'low', label: `Stok Menipis (${lowStockCount})` },
                  { id: 'empty', label: `Stok Habis (${emptyMedCount})` },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setMedStockFilter(pill.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      medStockFilter === pill.id
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
                <input
                  type="text"
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  placeholder="Cari nama obat, deskripsi, atau kategori..."
                  className="w-64 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                />
                <select
                  value={medSort}
                  onChange={(e) => setMedSort(e.target.value)}
                  className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-teal-600 focus:outline-none"
                >
                  <option value="name-asc">Urutkan: Nama A–Z</option>
                  <option value="name-desc">Urutkan: Nama Z–A</option>
                  <option value="stock-asc">Urutkan: Stok Terendah</option>
                  <option value="stock-desc">Urutkan: Stok Tertinggi</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">Nama Obat</th>
                    <th className="px-5 py-3.5">Deskripsi</th>
                    <th className="px-5 py-3.5">Kategori</th>
                    <th className="px-5 py-3.5">Stok</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleMedicines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        Data obat tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    visibleMedicines.map((med) => {
                      const stock = Number(med.stock);
                      const isLow = stock <= 10;
                      return (
                        <tr key={med.med_id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3.5 font-semibold text-slate-900">
                            {med.name}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600">
                            {med.desc || '-'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${
                                med.type === 'keras'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {med.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold ${
                                stock === 0
                                  ? 'bg-rose-600 text-white'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {stock === 0 ? 'Habis (0)' : `${stock} unit`}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditMedicineModal(med)}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
                              >
                                Edit / Restok
                              </button>
                              <button
                                type="button"
                                disabled={deletingMedId === med.med_id}
                                onClick={() => setDeleteMedTarget(med)}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: VERIFIKASI & MONITORING JANJI TEMU */}
        {activeTab === 'appointments' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Verifikasi &amp; Monitoring Janji Temu
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Admin dapat memantau seluruh jadwal lintas poliklinik sekaligus
                menyetujui atau menolak pengajuan berstatus Pending.
              </p>
            </div>

            {aptFeedback.message && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  aptFeedback.type === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {aptFeedback.message}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: `Semua (${appointments.length})` },
                {
                  id: 'pending',
                  label: `Menunggu Konfirmasi (${pendingAptCount})`,
                },
                { id: 'approved', label: 'Disetujui / Terjadwal' },
                { id: 'done', label: 'Selesai Diperiksa' },
                { id: 'closed', label: 'Ditolak / Dibatalkan' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setAptFilter(pill.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                    aptFilter === pill.id
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">ID</th>
                    <th className="px-5 py-3.5">Pasien</th>
                    <th className="px-5 py-3.5">Dokter &amp; Poli</th>
                    <th className="px-5 py-3.5">Jadwal</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleAppointments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        Tidak ada janji temu pada kategori ini.
                      </td>
                    </tr>
                  ) : (
                    visibleAppointments.map((apt) => (
                      <tr key={apt.apt_id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 font-bold text-slate-700">
                          #{apt.apt_id}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">
                            {apt.patient_name}
                          </div>
                          <div className="max-w-xs truncate text-xs text-slate-500">
                            {apt.complaint}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900">
                            {apt.doctor_name}
                          </div>
                          <div className="text-xs text-teal-700">
                            {apt.poli_name}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-700">
                          <div className="font-medium">
                            {formatDateID(apt.booking_date || apt.apt_date)}
                          </div>
                          <div className="text-slate-500">
                            Pukul {String(apt.start_time).slice(0, 5)} WITA
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={apt.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {apt.status === 'pending' ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                disabled={processingAptId === apt.apt_id}
                                onClick={() =>
                                  handleApproveAppointment(apt.apt_id)
                                }
                                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                disabled={processingAptId === apt.apt_id}
                                onClick={() => {
                                  setRejectTarget(apt);
                                  setRejectReason('');
                                  setRejectError('');
                                }}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MANAJEMEN PENGGUNA */}
        {activeTab === 'users' && (
          <UserManagementTab
            users={users}
            polis={polis}
            currentUserId={user?.user_id}
            onRefresh={loadDashboardData}
          />
        )}

        {/* TAB 5: MANAJEMEN POLIKLINIK */}
        {activeTab === 'polis' && (
          <PoliManagementTab polis={polis} onRefresh={loadDashboardData} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsReportTab
            appointments={appointments}
            prescriptions={prescriptions}
            medicines={medicines}
            polis={polis}
            users={users}/>
        )}
      </main>

      {/* MODAL TAMBAH / EDIT OBAT */}
      {medModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingMed ? `Edit / Restok: ${editingMed.name}` : 'Tambah Obat Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setMedModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="mt-4 space-y-4">
              {medError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                  {medError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nama Obat <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="Contoh: Paracetamol 500mg"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Deskripsi / Indikasi (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={medDesc}
                  onChange={(e) => setMedDesc(e.target.value)}
                  placeholder="Contoh: Analgesik dan penurun demam"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Kategori <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={medType}
                    onChange={(e) => setMedType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    <option value="biasa">Biasa</option>
                    <option value="keras">Keras</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Jumlah Stok <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={medStock}
                    onChange={(e) => setMedStock(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  disabled={savingMed}
                  onClick={() => setMedModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingMed}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {savingMed ? 'Menyimpan...' : 'Simpan Data Obat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TOLAK JANJI TEMU OLEH ADMIN */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Tolak Janji Temu #{rejectTarget.apt_id}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Pasien:{' '}
              <strong className="text-slate-800">{rejectTarget.patient_name}</strong>{' '}
              • Dokter: {rejectTarget.doctor_name}
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
                  placeholder="Contoh: Dokter berhalangan hadir, silakan pilih jadwal lain..."
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

      {/* MODAL KONFIRMASI HAPUS OBAT */}
      <ConfirmModal
        open={Boolean(deleteMedTarget)}
        title="Hapus Data Obat?"
        message={
          deleteMedTarget
            ? `Apakah Anda yakin ingin menghapus "${deleteMedTarget.name}" dari katalog farmasi? Obat yang sudah pernah masuk resep pasien tidak dapat dihapus.`
            : ''
        }
        loading={Boolean(deletingMedId)}
        onCancel={() => setDeleteMedTarget(null)}
        onConfirm={handleConfirmDeleteMedicine}
      />
    </div>
  );
}