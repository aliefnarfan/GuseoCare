'use client';

import { useMemo, useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

function formatDateShort(dateInput) {
  if (!dateInput) return '-';
  return new Date(dateInput).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDateOnlyISO(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function UserManagementTab({
  users,
  polis,
  currentUserId,
  onRefresh,
}) {
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('pasien');
  const [poliId, setPoliId] = useState('');
  const [bio, setBio] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal Konfirmasi Hapus
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const roleCounts = useMemo(() => {
    return {
      all: users.length,
      admin: users.filter((u) => u.role === 'admin').length,
      dokter: users.filter((u) => u.role === 'dokter').length,
      pasien: users.filter((u) => u.role === 'pasien').length,
    };
  }, [users]);

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (dateFilter && getDateOnlyISO(u.created_at) !== dateFilter) return false;
      if (q) {
        const match =
          String(u.name || '').toLowerCase().includes(q) ||
          String(u.email || '').toLowerCase().includes(q) ||
          String(u.poli_name || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [users, roleFilter, dateFilter, search]);

  function openCreateModal() {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('pasien');
    setPoliId(polis[0]?.poli_id ? String(polis[0].poli_id) : '');
    setBio('');
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(u) {
    setEditingUser(u);
    setName(u.name || '');
    setEmail(u.email || '');
    setPassword('');
    setRole(u.role || 'pasien');
    setPoliId(
      u.poli_id
        ? String(u.poli_id)
        : polis[0]?.poli_id
        ? String(polis[0].poli_id)
        : ''
    );
    setBio(u.bio || '');
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !email.trim()) {
      setFormError('Nama lengkap dan email wajib diisi.');
      return;
    }
    if (!editingUser && !password.trim()) {
      setFormError('Password wajib diisi untuk pengguna baru.');
      return;
    }
    if (role === 'dokter' && !poliId) {
      setFormError('Poliklinik wajib dipilih untuk peran Dokter.');
      return;
    }

    setSaving(true);
    try {
      const url = editingUser
        ? `/api/users/${editingUser.user_id}`
        : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
          role,
          poli_id: role === 'dokter' ? Number(poliId) : null,
          bio: role === 'dokter' ? bio.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Gagal menyimpan data pengguna.');
        return;
      }

      setModalOpen(false);
      setFeedback({
        type: 'success',
        message: data.message || 'Data pengguna berhasil disimpan.',
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

    setDeletingId(deleteTarget.user_id);
    setFeedback({ type: '', message: '' });
    try {
      const res = await fetch(`/api/users/${deleteTarget.user_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Gagal menghapus pengguna.',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: data.message || 'Pengguna berhasil dihapus.',
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
            Manajemen Pengguna (Admin, Dokter &amp; Pasien)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Kelola akun seluruh pengguna sistem, tetapkan poliklinik dokter, dan
            filter berdasarkan peran atau tanggal registrasi.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700"
        >
          + Tambah Pengguna
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

      {/* Filter Peran, Tanggal Registrasi, dan Pencarian */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `Semua (${roleCounts.all})` },
            { id: 'admin', label: `Admin (${roleCounts.admin})` },
            { id: 'dokter', label: `Dokter (${roleCounts.dokter})` },
            { id: 'pasien', label: `Pasien (${roleCounts.pasien})` },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setRoleFilter(pill.id)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                roleFilter === pill.id
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Filter berdasarkan tanggal registrasi"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
          />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              Reset Tanggal
            </button>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau poli..."
            className="w-60 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabel Pengguna */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="px-5 py-3.5">Nama &amp; Email</th>
              <th className="px-5 py-3.5">Peran</th>
              <th className="px-5 py-3.5">Poliklinik (Dokter)</th>
              <th className="px-5 py-3.5">Tgl Registrasi</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visibleUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-sm text-slate-500"
                >
                  Tidak ada pengguna yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              visibleUsers.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        u.role === 'admin'
                          ? 'bg-slate-900 text-white'
                          : u.role === 'dokter'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-700">
                    {u.role === 'dokter' ? u.poli_name || '-' : '-'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">
                    {formatDateShort(u.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
                      >
                        Edit
                      </button>
                      {Number(u.user_id) !== Number(currentUserId) && (
                        <button
                          type="button"
                          disabled={deletingId === u.user_id}
                          onClick={() => setDeleteTarget(u)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          {deletingId === u.user_id ? '...' : 'Hapus'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah / Edit Pengguna */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
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
                  Nama Lengkap <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Peran <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    <option value="pasien">Pasien</option>
                    <option value="dokter">Dokter</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password {editingUser ? '(Opsional)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      editingUser ? 'Kosongkan jika tetap' : 'Min. 6 karakter'
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              {role === 'dokter' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Poliklinik <span className="text-rose-600">*</span>
                    </label>
                    <select
                      required
                      value={poliId}
                      onChange={(e) => setPoliId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                    >
                      <option value="">-- Pilih Poliklinik --</option>
                      {polis.map((p) => (
                        <option key={p.poli_id} value={p.poli_id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Bio / Spesialisasi Dokter
                    </label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Contoh: Spesialis Penyakit Dalam Konsultan"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                </>
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
                  {saving ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pengguna */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Pengguna?"
        message={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus "${deleteTarget.name}" (${deleteTarget.role})? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.`
            : ''
        }
        loading={Boolean(deletingId)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}