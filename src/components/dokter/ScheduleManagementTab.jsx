'use client';

import { useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

const DAYS = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

function formatEndTime(startTime, duration = 30) {
  if (!startTime) return '';
  const [h, m] = String(startTime).split(':').map(Number);
  const totalMinutes = h * 60 + m + Number(duration);
  const endH = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
  const endM = String(totalMinutes % 60).padStart(2, '0');
  return `${endH}:${endM}`;
}

export default function ScheduleManagementTab({ schedules, onRefresh }) {
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal Tambah / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSch, setEditingSch] = useState(null);
  const [day, setDay] = useState('Senin');
  const [startTime, setStartTime] = useState('09:00');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Konfirmasi Hapus
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function openCreateModal() {
    setEditingSch(null);
    setDay('Senin');
    setStartTime('09:00');
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(sch) {
    setEditingSch(sch);
    setDay(sch.day || 'Senin');
    setStartTime(String(sch.start_time || '09:00').slice(0, 5));
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!day || !startTime) {
      setFormError('Hari dan jam mulai wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const url = editingSch
        ? `/api/schedules/${editingSch.sch_id}`
        : '/api/schedules';
      const method = editingSch ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day,
          start_time: startTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Gagal menyimpan jadwal praktik.');
        return;
      }

      setModalOpen(false);
      setFeedback({
        type: 'success',
        message: data.message || 'Jadwal praktik berhasil disimpan.',
      });
      await onRefresh();
    } catch {
      setFormError('Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.sch_id);
    setFeedback({ type: '', message: '' });
    try {
      const res = await fetch(`/api/schedules/${deleteTarget.sch_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Gagal menghapus jadwal.',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: data.message || 'Jadwal berhasil dihapus.',
      });
      await onRefresh();
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan jaringan.' });
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Pengaturan Jadwal Praktik Saya
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Kelola slot ketersediaan konsultasi Anda. Setiap slot berdurasi tetap{' '}
            <strong>30 menit</strong> dan tidak boleh tumpang tindih.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700"
        >
          + Tambah Slot Jadwal
        </button>
      </div>

      {feedback.message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
          Anda belum memiliki jadwal praktik. Klik &ldquo;+ Tambah Slot Jadwal&rdquo;
          untuk mulai mengatur ketersediaan konsultasi.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((sch) => {
            const start = String(sch.start_time).slice(0, 5);
            const end = formatEndTime(start, sch.duration || 30);

            return (
              <div
                key={sch.sch_id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                      {sch.day}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {sch.duration || 30} menit
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-bold text-slate-900">
                    {start} – {end} WITA
                  </p>
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(sch)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === sch.sch_id}
                    onClick={() => setDeleteTarget(sch)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    {deletingId === sch.sch_id ? '...' : 'Hapus'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit Jadwal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingSch ? 'Edit Jadwal Praktik' : 'Tambah Jadwal Praktik'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                  {formError}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Hari Praktik <span className="text-rose-600">*</span>
                </label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Jam Mulai <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Durasi Konsultasi
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="30 Menit (Tetap)"
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500"
                  />
                </div>
              </div>

              {startTime && (
                <p className="text-xs text-slate-500">
                  Slot konsultasi: <strong>{day}</strong>, pukul{' '}
                  <strong>
                    {startTime} – {formatEndTime(startTime, 30)} WITA
                  </strong>
                  .
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Jadwal */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Jadwal Praktik?"
        message={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus jadwal hari ${deleteTarget.day} pukul ${String(deleteTarget.start_time).slice(0, 5)} WITA? Jadwal yang sudah memiliki riwayat janji temu tidak dapat dihapus.`
            : ''
        }
        loading={Boolean(deletingId)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}