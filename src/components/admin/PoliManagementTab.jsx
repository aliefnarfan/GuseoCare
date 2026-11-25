'use client';

import { useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

export default function PoliManagementTab({ polis, onRefresh }) {
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPoli, setEditingPoli] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Konfirmasi Hapus
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  function openCreateModal() {
    setEditingPoli(null);
    setName('');
    setDescription('');
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(poli) {
    setEditingPoli(poli);
    setName(poli.name || '');
    setDescription(poli.description || poli.desc || '');
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Nama poliklinik wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const url = editingPoli
        ? `/api/polis/${editingPoli.poli_id}`
        : '/api/polis';
      const method = editingPoli ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Gagal menyimpan poliklinik.');
        return;
      }

      setModalOpen(false);
      setFeedback({
        type: 'success',
        message: data.message || 'Poliklinik berhasil disimpan.',
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

    setDeletingId(deleteTarget.poli_id);
    setFeedback({ type: '', message: '' });
    try {
      const res = await fetch(`/api/polis/${deleteTarget.poli_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Gagal menghapus poliklinik.',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: data.message || 'Poliklinik berhasil dihapus.',
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
            Manajemen Unit Poliklinik
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Tambah, ubah, atau hapus unit layanan poliklinik RS Pendidikan
            Universitas Guseo.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700"
        >
          + Tambah Poliklinik
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {polis.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
            Belum ada data poliklinik.
          </div>
        ) : (
          polis.map((poli) => (
            <div
              key={poli.poli_id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div>
                <span className="inline-block rounded-md bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700">
                  Poli #{poli.poli_id}
                </span>
                <h3 className="mt-2 text-base font-bold text-slate-900">
                  {poli.name}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {poli.description ||
                    poli.desc ||
                    'Belum ada deskripsi poliklinik.'}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => openEditModal(poli)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={deletingId === poli.poli_id}
                  onClick={() => setDeleteTarget(poli)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  {deletingId === poli.poli_id ? '...' : 'Hapus'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Tambah / Edit Poliklinik */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPoli ? 'Edit Poliklinik' : 'Tambah Poliklinik Baru'}
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
                  Nama Poliklinik <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Poli Gigi & Mulut"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Deskripsi Layanan
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan ruang lingkup layanan poliklinik ini..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

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
                  {saving ? 'Menyimpan...' : 'Simpan Poliklinik'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Poliklinik */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Poliklinik?"
        message={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus "${deleteTarget.name}"? Poliklinik yang masih memiliki dokter terdaftar tidak dapat dihapus.`
            : ''
        }
        loading={Boolean(deletingId)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}