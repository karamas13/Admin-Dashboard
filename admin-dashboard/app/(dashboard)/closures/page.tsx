'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/services/api';
import { TrashIcon, PlusIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useClinic } from '@/context/ClinicContext';

export interface ScheduleException {
  id?: string;
  schedule_exception_id?: string;
  clinic_id?: string;
  starts_at: string;
  ends_at: string;
  availability_effect: 'closed' | 'open';
  reason_code: string;
  is_all_day?: boolean;
  note?: string;
}

const getReasonLabel = (code: string) => {
  const map: Record<string, string> = {
    holiday: 'Επίσημη Αργία',
    vacation: 'Διακοπές',
    personal: 'Προσωπικός Λόγος / Απουσία',
    staff_absence: 'Απουσία Προσωπικού',
    extra_hours: 'Έκτακτο Ωράριο',
    closed: 'Κλειστό',
    other: 'Άλλο',
  };
  return map[code?.toLowerCase()] || code || 'Εξαίρεση';
};

export default function ScheduleExceptionsPage() {
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { isReadOnly, isOwner, selectedClinic } = useClinic();
  const isActionDisabled = isReadOnly || !isOwner;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form State
  const [availabilityEffect, setAvailabilityEffect] = useState<'closed' | 'open'>('closed');
  const [reasonCode, setReasonCode] = useState('holiday');
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Φόρτωση Exceptions
  const loadExceptions = useCallback(async () => {
    if (!selectedClinic?.id) return;

    try {
      setIsLoading(true);
      setError('');

      const now = new Date();
      const startAt = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
      const endAt = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59).toISOString();

      const list = await api.getScheduleExceptions(startAt, endAt, selectedClinic.id);
      setExceptions(list || []);
    } catch (err: any) {
      console.error('Σφάλμα κατά τη φόρτωση των schedule exceptions:', err);
      setError('Αποτυχία φόρτωσης εξαιρέσεων ωραρίου.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClinic?.id]);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  // 2. Υποβολή Νέας Εξαίρεσης
  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('Παρακαλώ συμπληρώστε ημερομηνία έναρξης και λήξης.');
      return;
    }

    try {
      setIsSubmitting(true);

      let startsAtISO: string;
      let endsAtISO: string;

      if (isAllDay) {
        startsAtISO = new Date(`${startDate}T00:00:00`).toISOString();
        endsAtISO = new Date(`${endDate}T23:59:59`).toISOString();
      } else {
        startsAtISO = new Date(`${startDate}T${startTime}:00`).toISOString();
        endsAtISO = new Date(`${endDate}T${endTime}:00`).toISOString();
      }

      const payload = {
        clinic_id: selectedClinic?.id,
        availability_effect: availabilityEffect,
        reason_code: reasonCode,
        is_all_day: isAllDay,
        starts_at: startsAtISO,
        ends_at: endsAtISO,
        note,
      };

      await api.createScheduleException(payload, selectedClinic?.id);

      setIsAddModalOpen(false);
      // Reset Form
      setStartDate('');
      setEndDate('');
      setNote('');
      loadExceptions();
    } catch (err) {
      console.error('Error creating exception:', err);
      alert('Σφάλμα κατά τη δημιουργία της εξαίρεσης.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Διαγραφή Εξαίρεσης
  const handleDeleteException = async (id: string) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την εξαίρεση;')) return;

    try {
      setIsDeleting(id);
      await api.deleteScheduleException(id, selectedClinic?.id);

      setExceptions((prev) =>
        prev.filter((item) => (item.schedule_exception_id || item.id) !== id)
      );
    } catch (err) {
      console.error('Error deleting exception:', err);
      alert('Αποτυχία διαγραφής.');
    } finally {
      setIsDeleting(null);
    }
  };

  // Helper Format
  const formatDateRange = (item: ScheduleException) => {
    try {
      const start = new Date(item.starts_at);
      const end = new Date(item.ends_at);

      const startDateStr = start.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const endDateStr = end.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      if (item.is_all_day) {
        return startDateStr === endDateStr ? `${startDateStr} (Ολόκληρη ημέρα)` : `${startDateStr} έως ${endDateStr} (Ολόκληρη ημέρα)`;
      }

      const startTimeStr = start.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
      const endTimeStr = end.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });

      return startDateStr === endDateStr
        ? `${startDateStr}, ${startTimeStr} - ${endTimeStr}`
        : `${startDateStr} ${startTimeStr} έως ${endDateStr} ${endTimeStr}`;
    } catch {
      return `${item.starts_at} - ${item.ends_at}`;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Container */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Εξαιρέσεις Ωραρίου (Schedule Exceptions)
            </h1>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ορίστε αργίες, απουσίες, κλειστές ώρες ή έκτακτο ωράριο λειτουργίας που επηρεάζουν τη διαθεσιμότητα των ραντεβού.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={isActionDisabled}
          className={`px-4 py-2.5 font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 ${
            isActionDisabled
              ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed opacity-70'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <PlusIcon className="w-4 h-4" />
          Προσθήκη Εξαίρεσης
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Exceptions List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Τύπος</th>
                <th className="p-3.5">Αιτιολογία</th>
                <th className="p-3.5">Διάρκεια / Ωράριο</th>
                <th className="p-3.5 text-right">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 dark:text-slate-500">
                    Φόρτωση δεδομένων...
                  </td>
                </tr>
              ) : exceptions.length > 0 ? (
                exceptions.map((item) => {
                  const itemId = item.schedule_exception_id || item.id || '';
                  const isClosedEffect = item.availability_effect === 'closed';

                  return (
                    <tr key={itemId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-1 font-bold text-[10px] uppercase rounded border ${
                            isClosedEffect
                              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                              : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                          }`}
                        >
                          {isClosedEffect ? 'Κλειστό / Απουσία' : 'Extra Ωράριο'}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100">
                        {getReasonLabel(item.reason_code)}
                        {item.note && <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{item.note}</p>}
                      </td>
                      <td className="p-3.5 font-medium">{formatDateRange(item)}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteException(itemId)}
                          disabled={isDeleting === itemId || isActionDisabled}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 dark:text-slate-500">
                    Δεν έχουν καταχωρηθεί εξαιρέσεις ωραρίου.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD EXCEPTION MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Προσθήκη Νέας Εξαίρεσης
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateException} className="space-y-4 text-xs">
              {/* Availability Effect */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Τύπος Εξαίρεσης</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAvailabilityEffect('closed');
                      setReasonCode('holiday');
                    }}
                    className={`p-2 rounded-xl font-semibold border ${
                      availabilityEffect === 'closed'
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    🚫 Κλείσιμο / Απουσία
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAvailabilityEffect('open');
                      setReasonCode('extra_hours');
                    }}
                    className={`p-2 rounded-xl font-semibold border ${
                      availabilityEffect === 'open'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    🟢 Extra Ωράριο
                  </button>
                </div>
              </div>

              {/* Reason Code */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Αιτιολογία</label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none font-medium"
                >
                  {availabilityEffect === 'closed' ? (
                    <>
                      <option value="holiday">Επίσημη Αργία</option>
                      <option value="vacation">Διακοπές</option>
                      <option value="staff_absence">Απουσία Προσωπικού</option>
                      <option value="personal">Προσωπικός Λόγος</option>
                      <option value="other">Άλλο</option>
                    </>
                  ) : (
                    <option value="extra_hours">Έκτακτη Λειτουργία</option>
                  )}
                </select>
              </div>

              {/* Full Day vs Partial Day Toggle */}
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="allDayCheck"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                />
                <label htmlFor="allDayCheck" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Ολόκληρη Ημέρα (Full-Day)
                </label>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ημ. Έναρξης</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ημ. Λήξης</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Times (Only if NOT All-Day) */}
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ώρα Έναρξης</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ώρα Λήξης</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Σημείωση (Προαιρετικό)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="π.χ. Συντήρηση εξοπλισμού"
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors"
                >
                  {isSubmitting ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}