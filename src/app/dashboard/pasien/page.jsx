'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getDayNameFromDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  return DAY_NAMES[dateObj.getDay()];
}

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

function toDateInputString(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput).slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function PatientDashboardPage() {
  const router = useRouter();
  const bookingSectionRef = useRef(null);

  const [user, setUser] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);

  const [activeTab, setActiveTab] = useState('booking');
  const [aptFilter, setAptFilter] = useState('all'); // 'all' | 'active' | 'history'

  // Form Booking State
  const [selectedPoli, setSelectedPoli] = useState('Semua');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedSchId, setSelectedSchId] = useState('');
  const [aptDate, setAptDate] = useState('');
  const [complaint, setComplaint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Modal Konfirmasi Pembatalan
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  // Modal Ubah Jadwal (Reschedule)
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleSchId, setRescheduleSchId] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  async function loadDashboardData() {
    try {
      const [meRes, docRes, aptRes, recRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/doctors'),
        fetch('/api/appointments'),
        fetch('/api/medical-records'),
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

      if (currentUser.role !== 'pasien') {
        router.push(
          currentUser.role === 'dokter' ? '/dashboard/dokter' : '/dashboard/admin'
        );
        return;
      }

      const docData = docRes.ok ? await docRes.json() : { doctors: [] };
      const aptData = aptRes.ok ? await aptRes.json() : { appointments: [] };
      const recData = recRes.ok ? await recRes.json() : { medical_records: [] };

      setUser(currentUser);
      setDoctors(docData.doctors || []);
      setAppointments(aptData.appointments || []);
      setRecords(recData.medical_records || recData.records || []);
    } catch (err) {
      console.error('Gagal memuat data dashboard pasien:', err);
    } finally {
      setLoadingPage(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  function navigateToBookingForm() {
    setActiveTab('booking');
    setTimeout(() => {
      bookingSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 60);
  }

  const poliOptions = useMemo(() => {
    const unique = Array.from(new Set(doctors.map((d) => d.poli_name)));
    return ['Semua', ...unique];
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (selectedPoli === 'Semua') return doctors;
    return doctors.filter((d) => d.poli_name === selectedPoli);
  }, [doctors, selectedPoli]);

  const selectedDoctor = useMemo(() => {
    return doctors.find((d) => String(d.doctor_id) === String(selectedDoctorId)) || null;
  }, [doctors, selectedDoctorId]);

  const selectedSchedule = useMemo(() => {
    if (!selectedDoctor) return null;
    return (
      selectedDoctor.schedules.find((s) => String(s.sch_id) === String(selectedSchId)) ||
      null
    );
  }, [selectedDoctor, selectedSchId]);

  const selectedDateDayName = getDayNameFromDate(aptDate);
  const isDayMismatch =
    selectedSchedule && aptDate && selectedDateDayName !== selectedSchedule.day;

  // Pengurutan Janji Temu: Aktif terdekat (ASC) di atas, Riwayat Selesai/Batal (DESC) di bawah
  const sortedAppointments = useMemo(() => {
    const isActiveStatus = (st) => st === 'pending' || st === 'approved';
    return [...appointments].sort((a, b) => {
      const aActive = isActiveStatus(a.status);
      const bActive = isActiveStatus(b.status);
      if (aActive !== bActive) return aActive ? -1 : 1;

      const dateA = new Date(a.booking_date || a.apt_date).getTime();
      const dateB = new Date(b.booking_date || b.apt_date).getTime();

      if (aActive && bActive) {
        if (dateA !== dateB) return dateA - dateB; // Terdekat duluan (ASC)
        return String(a.start_time).localeCompare(String(b.start_time));
      }

      if (dateA !== dateB) return dateB - dateA; // Riwayat terbaru duluan (DESC)
      return Number(b.apt_id) - Number(a.apt_id);
    });
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    if (aptFilter === 'active') {
      return sortedAppointments.filter(
        (a) => a.status === 'pending' || a.status === 'approved'
      );
    }
    if (aptFilter === 'history') {
      return sortedAppointments.filter(
        (a) => a.status === 'done' || a.status === 'rejected' || a.status === 'cancelled'
      );
    }
    return sortedAppointments;
  }, [sortedAppointments, aptFilter]);

  const activeAppointmentsCount = appointments.filter(
    (a) => a.status === 'pending' || a.status === 'approved'
  ).length;
  const historyAppointmentsCount = appointments.length - activeAppointmentsCount;

  async function handleBookingSubmit(e) {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!selectedDoctorId || !selectedSchId || !aptDate || !complaint.trim()) {
      setFeedback({
        type: 'error',
        message: 'Harap lengkapi dokter, slot jadwal, tanggal kunjungan, dan keluhan.',
      });
      return;
    }

    if (isDayMismatch) {
      setFeedback({
        type: 'error',
        message: `Tanggal yang dipilih jatuh pada hari ${selectedDateDayName}, sedangkan jadwal slot ini khusus hari ${selectedSchedule.day}.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: Number(selectedDoctorId),
          sch_id: Number(selectedSchId),
          apt_date: aptDate,
          complaint: complaint.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Gagal mengajukan janji temu.',
        });
        setSubmitting(false);
        return;
      }

      setFeedback({
        type: 'success',
        message: 'Pengajuan janji temu berhasil dikirim dan menunggu konfirmasi.',
      });
      setSelectedSchId('');
      setAptDate('');
      setComplaint('');
      await loadDashboardData();
      setAptFilter('active');
      setActiveTab('appointments');
    } catch {
      setFeedback({
        type: 'error',
        message: 'Terjadi kesalahan jaringan saat mengirim pengajuan.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmCancelAppointment() {
    if (!cancelTarget) return;
    const aptId = cancelTarget.apt_id;
    setCancellingId(aptId);
    try {
      const res = await fetch(`/api/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (res.ok) {
        setCancelTarget(null);
        await loadDashboardData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Gagal membatalkan janji temu.');
      }
    } finally {
      setCancellingId(null);
    }
  }

  function openRescheduleModal(apt) {
    setRescheduleTarget(apt);
    setRescheduleSchId(String(apt.sch_id));
    setRescheduleDate(toDateInputString(apt.booking_date || apt.apt_date));
    setRescheduleError('');
  }

  const rescheduleDoctor = useMemo(() => {
    if (!rescheduleTarget) return null;
    return (
      doctors.find((d) => String(d.doctor_id) === String(rescheduleTarget.doctor_id)) ||
      null
    );
  }, [doctors, rescheduleTarget]);

  const rescheduleSelectedSlot = useMemo(() => {
    if (!rescheduleDoctor) return null;
    return (
      rescheduleDoctor.schedules.find(
        (s) => String(s.sch_id) === String(rescheduleSchId)
      ) || null
    );
  }, [rescheduleDoctor, rescheduleSchId]);

  const rescheduleDayName = getDayNameFromDate(rescheduleDate);
  const isRescheduleDayMismatch =
    rescheduleSelectedSlot &&
    rescheduleDate &&
    rescheduleDayName !== rescheduleSelectedSlot.day;

  async function handleRescheduleSubmit(e) {
    e.preventDefault();
    if (!rescheduleTarget) return;
    setRescheduleError('');

    if (!rescheduleSchId || !rescheduleDate) {
      setRescheduleError('Harap pilih slot jadwal dan tanggal kunjungan baru.');
      return;
    }

    if (isRescheduleDayMismatch) {
      setRescheduleError(
        `Tanggal yang dipilih jatuh pada hari ${rescheduleDayName}, sedangkan slot praktik ini khusus hari ${rescheduleSelectedSlot.day}.`
      );
      return;
    }

    setRescheduling(true);
    try {
      const res = await fetch(`/api/appointments/${rescheduleTarget.apt_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sch_id: Number(rescheduleSchId),
          booking_date: rescheduleDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRescheduleError(data.error || 'Gagal memperbarui jadwal janji temu.');
        return;
      }

      setRescheduleTarget(null);
      await loadDashboardData();
    } catch {
      setRescheduleError('Terjadi kesalahan jaringan saat mengubah jadwal.');
    } finally {
      setRescheduling(false);
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar user={user} />
        <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm font-medium text-slate-500">
          Memuat portal pasien GuseoCare...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar user={user} />

      {/* Header Portal Pasien */}
      <section className="border-b border-slate-800 bg-slate-900 py-10 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
                Portal Layanan Pasien
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Selamat Datang, {user?.name}
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Kelola jadwal konsultasi dokter spesialis, riwayat pemeriksaan klinis, dan
                resep farmasi Anda.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3">
                <span className="block text-xs font-medium text-slate-400">
                  Janji Temu Aktif
                </span>
                <span className="mt-0.5 block text-2xl font-bold text-white">
                  {activeAppointmentsCount}
                </span>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3">
                <span className="block text-xs font-medium text-slate-400">
                  Riwayat Rekam Medis
                </span>
                <span className="mt-0.5 block text-2xl font-bold text-teal-400">
                  {records.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sub-Navigasi Tab Dashboard */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {[
            { id: 'booking', label: 'Buat Janji Temu' },
            {
              id: 'appointments',
              label: `Jadwal & Status (${appointments.length})`,
            },
            {
              id: 'records',
              label: `Rekam Medis & Resep (${records.length})`,
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
      <main
        ref={bookingSectionRef}
        className="mx-auto max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6 lg:px-8"
      >
        {/* TAB 1: FORM BOOKING JANJI TEMU */}
        {activeTab === 'booking' && (
          <div className="grid items-start gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Formulir Pendaftaran Konsultasi
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Pilih poliklinik, dokter spesialis, dan slot waktu praktik yang
                      tersedia.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    <span className="font-bold text-rose-600">*</span> Wajib diisi
                  </span>
                </div>

                {feedback.message && (
                  <div
                    className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                      feedback.type === 'error'
                        ? 'border-rose-200 bg-rose-50 text-rose-800'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}

                <form onSubmit={handleBookingSubmit} className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        1. Unit Poliklinik
                      </label>
                      <div className="relative">
                        <select
                          value={selectedPoli}
                          onChange={(e) => {
                            setSelectedPoli(e.target.value);
                            setSelectedDoctorId('');
                            setSelectedSchId('');
                          }}
                          className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                        >
                          {poliOptions.map((poli) => (
                            <option key={poli} value={poli}>
                              {poli === 'Semua' ? 'Semua Poliklinik' : poli}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-slate-500">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        2. Dokter Pemeriksa <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={selectedDoctorId}
                          onChange={(e) => {
                            setSelectedDoctorId(e.target.value);
                            setSelectedSchId('');
                          }}
                          className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                        >
                          <option value="">-- Pilih Dokter --</option>
                          {filteredDoctors.map((doc) => (
                            <option key={doc.doctor_id} value={doc.doctor_id}>
                              {doc.name} ({doc.poli_name})
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-slate-500">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      3. Slot Jadwal Praktik (Durasi 30 Menit){' '}
                      <span className="text-rose-600">*</span>
                    </label>
                    {!selectedDoctor ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-xs text-slate-500">
                        Pilih dokter terlebih dahulu untuk melihat slot hari dan jam praktik.
                      </div>
                    ) : (
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {selectedDoctor.schedules.map((sch) => {
                          const isSelected = String(selectedSchId) === String(sch.sch_id);
                          return (
                            <button
                              key={sch.sch_id}
                              type="button"
                              onClick={() => setSelectedSchId(String(sch.sch_id))}
                              className={`rounded-xl border px-3.5 py-3 text-left transition ${
                                isSelected
                                  ? 'border-teal-600 bg-teal-600 text-white'
                                  : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-teal-400 hover:bg-white'
                              }`}
                            >
                              <span className="block text-xs font-bold uppercase tracking-wider">
                                {sch.day}
                              </span>
                              <span
                                className={`mt-0.5 block text-sm font-semibold ${
                                  isSelected ? 'text-teal-50' : 'text-slate-600'
                                }`}
                              >
                                Pukul {String(sch.start_time).slice(0, 5)} WITA
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      4. Tanggal Kunjungan <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={aptDate}
                      onChange={(e) => setAptDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none sm:max-w-xs"
                    />
                    {selectedSchedule && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        Pastikan tanggal yang dipilih jatuh pada hari{' '}
                        <strong className="text-slate-800">{selectedSchedule.day}</strong>.
                        {aptDate && (
                          <span
                            className={`ml-1.5 font-semibold ${
                              isDayMismatch ? 'text-rose-600' : 'text-teal-700'
                            }`}
                          >
                            (Tanggal dipilih: Hari {selectedDateDayName})
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      5. Keluhan Utama & Gejala <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={complaint}
                      onChange={(e) => setComplaint(e.target.value)}
                      placeholder="Jelaskan keluhan medis atau gejala yang Anda rasakan..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || Boolean(isDayMismatch)}
                    className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Mengirim Pengajuan...' : 'Ajukan Janji Temu'}
                  </button>
                </form>
              </div>
            </div>

            {/* Panel Sticky: Ringkasan Janji Temu */}
            <div className="sticky top-24 self-start">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Ringkasan Janji Temu
                </h3>
                {selectedDoctor ? (
                  <div className="mt-4">
                    <span className="inline-block rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                      {selectedDoctor.poli_name}
                    </span>
                    <p className="mt-3 text-lg font-bold text-slate-900">
                      {selectedDoctor.name}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {selectedDoctor.bio}
                    </p>

                    <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500">Slot Praktik</span>
                        <span className="font-semibold text-slate-900">
                          {selectedSchedule
                            ? `${selectedSchedule.day}, ${String(
                                selectedSchedule.start_time
                              ).slice(0, 5)} WITA`
                            : 'Belum dipilih'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500">Tanggal Kunjungan</span>
                        <span
                          className={`text-right font-semibold ${
                            isDayMismatch ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {aptDate ? formatDateID(aptDate) : 'Belum dipilih'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">Ketentuan Kunjungan:</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-4">
                        <li>Satu slot jadwal hanya berlaku untuk satu pasien.</li>
                        <li>Harap hadir 15 menit sebelum jam konsultasi dimulai.</li>
                        <li>
                          Perubahan jadwal atau pembatalan mandiri hanya dapat dilakukan
                          sebelum status disetujui.
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Pilih dokter pada formulir di samping untuk melihat informasi
                    spesialisasi dan ringkasan jadwal konsultasi Anda secara langsung.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DAFTAR & STATUS JANJI TEMU */}
        {activeTab === 'appointments' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Daftar Janji Temu Konsultasi
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Jadwal aktif diurutkan berdasarkan tanggal kunjungan terdekat.
                </p>
              </div>
              <button
                type="button"
                onClick={navigateToBookingForm}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                + Buat Janji Baru
              </button>
            </div>

            {/* Filter Pill Status */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: `Semua (${appointments.length})` },
                { id: 'active', label: `Aktif (${activeAppointmentsCount})` },
                { id: 'history', label: `Selesai / Batal (${historyAppointmentsCount})` },
              ].map((pill) => {
                const isPillActive = aptFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setAptFilter(pill.id)}
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
              <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center">
                <p className="text-sm text-slate-500">
                  {appointments.length === 0
                    ? 'Belum ada riwayat pengajuan janji temu.'
                    : 'Tidak ada janji temu pada kategori filter ini.'}
                </p>
                {appointments.length === 0 && (
                  <button
                    type="button"
                    onClick={navigateToBookingForm}
                    className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
                  >
                    + Buat Janji Temu Pertama
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {visibleAppointments.map((apt, idx) => {
                  const isNearestActive =
                    idx === 0 &&
                    (apt.status === 'pending' || apt.status === 'approved');

                  return (
                    <div
                      key={apt.apt_id}
                      className={`flex flex-col justify-between gap-4 rounded-2xl border bg-white p-6 md:flex-row md:items-center ${
                        isNearestActive
                          ? 'border-teal-300 ring-1 ring-teal-100'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                            #{apt.apt_id}
                          </span>
                          <span className="text-xs font-semibold text-teal-700">
                            {apt.poli_name}
                          </span>
                          <StatusBadge status={apt.status} />
                          {isNearestActive && (
                            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                              Jadwal Terdekat
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                          {apt.doctor_name}
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

                      {apt.status === 'pending' && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => openRescheduleModal(apt)}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
                          >
                            Ubah Jadwal
                          </button>
                          <button
                            type="button"
                            disabled={cancellingId === apt.apt_id}
                            onClick={() => setCancelTarget(apt)}
                            className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                          >
                            {cancellingId === apt.apt_id
                              ? 'Membatalkan...'
                              : 'Batalkan Janji'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REKAM MEDIS & RESEP FARMASI */}
        {activeTab === 'records' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Riwayat Rekam Medis & Resep Obat
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Hasil pemeriksaan dokter beserta status penyiapan obat di instalasi
                farmasi.
              </p>
            </div>

            {records.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center">
                <p className="text-sm font-medium text-slate-600">
                  Belum ada catatan rekam medis yang tersimpan.
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                  Hasil diagnosis dokter dan rincian resep obat akan muncul di sini
                  setelah konsultasi Anda selesai diperiksa.
                </p>
                <button
                  type="button"
                  onClick={navigateToBookingForm}
                  className="mt-5 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-teal-700"
                >
                  + Buat Janji Konsultasi
                </button>
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
                          {rec.poli_name} • {formatDateID(rec.booking_date)}
                        </span>
                        <h3 className="mt-1 text-lg font-bold text-slate-900">
                          {rec.doctor_name}
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
                          Catatan & Anjuran Dokter
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
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Rincian Resep Obat (No. Resep #{rec.prs_id})
                            </h4>
                          </div>

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

      {/* MODAL KONFIRMASI PEMBATALAN JANJI TEMU */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Batalkan Janji Temu #{cancelTarget.apt_id}?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Anda akan membatalkan konsultasi dengan{' '}
              <strong className="text-slate-900">{cancelTarget.doctor_name}</strong> pada{' '}
              <strong className="text-slate-900">
                {formatDateID(cancelTarget.booking_date || cancelTarget.apt_date)}
              </strong>{' '}
              pukul {String(cancelTarget.start_time).slice(0, 5)} WITA. Tindakan ini tidak
              dapat diurungkan.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(cancellingId)}
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={Boolean(cancellingId)}
                onClick={confirmCancelAppointment}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {cancellingId ? 'Membatalkan...' : 'Ya, Batalkan Janji'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UBAH JADWAL (RESCHEDULE) */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  Ubah Jadwal Konsultasi #{rescheduleTarget.apt_id}
                </span>
                <h3 className="mt-0.5 text-lg font-bold text-slate-900">
                  {rescheduleTarget.doctor_name}
                </h3>
                <p className="text-xs text-slate-500">{rescheduleTarget.poli_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-4">
              {rescheduleError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                  {rescheduleError}
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  1. Pilih Slot Praktik Baru
                </label>
                {rescheduleDoctor ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {rescheduleDoctor.schedules.map((sch) => {
                      const isSel = String(rescheduleSchId) === String(sch.sch_id);
                      return (
                        <button
                          key={sch.sch_id}
                          type="button"
                          onClick={() => setRescheduleSchId(String(sch.sch_id))}
                          className={`rounded-xl border px-3 py-2.5 text-left transition ${
                            isSel
                              ? 'border-teal-600 bg-teal-600 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-teal-400 hover:bg-white'
                          }`}
                        >
                          <span className="block text-[11px] font-bold uppercase">
                            {sch.day}
                          </span>
                          <span
                            className={`mt-0.5 block text-xs font-semibold ${
                              isSel ? 'text-teal-50' : 'text-slate-600'
                            }`}
                          >
                            {String(sch.start_time).slice(0, 5)} WITA
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Memuat slot jadwal dokter...</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  2. Pilih Tanggal Kunjungan Baru
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                />
                {rescheduleSelectedSlot && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Pastikan jatuh pada hari{' '}
                    <strong className="text-slate-800">
                      {rescheduleSelectedSlot.day}
                    </strong>
                    .
                    {rescheduleDate && (
                      <span
                        className={`ml-1 font-semibold ${
                          isRescheduleDayMismatch ? 'text-rose-600' : 'text-teal-700'
                        }`}
                      >
                        (Terpilih: Hari {rescheduleDayName})
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  disabled={rescheduling}
                  onClick={() => setRescheduleTarget(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rescheduling || Boolean(isRescheduleDayMismatch)}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rescheduling ? 'Menyimpan...' : 'Simpan Jadwal Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}