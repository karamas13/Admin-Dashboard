'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { 
  TrashIcon, 
  PlusIcon, 
  CalendarIcon, 
  ArchiveBoxIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';

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

const DAYS_OF_WEEK = [
  { id: '1', label: 'Δευτέρα' },
  { id: '2', label: 'Τρίτη' },
  { id: '3', label: 'Τετάρτη' },
  { id: '4', label: 'Πέμπτη' },
  { id: '5', label: 'Παρασκευή' },
  { id: '6', label: 'Σάββατο' },
  { id: '7', label: 'Κυριακή' },
];

// Δημιουργία επιλογών ώρας ανά 30 λεπτά (07:00 - 23:00) για φιλικό UI
const TIME_OPTIONS = Array.from({ length: 33 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const minute = i % 2 === 0 ? '00' : '30';
  const str = `${hour.toString().padStart(2, '0')}:${minute}`;
  return str;
});

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
  const { isReadOnly, isOwner, selectedClinic } = useClinic();
  const { closures: exceptions, loadingTab, fetchClosures } = useDashboard();
  
  const isLoading = loadingTab === 'closures';
  const isActionDisabled = isReadOnly || !isOwner;

  const [showHistory, setShowHistory] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // States για το Εβδομαδιαίο Ωράριο
  const [workingHours, setWorkingHours] = useState<Record<string, Array<{ start: string; end: string }>>>({
    '1': [{ start: '09:00', end: '17:00' }],
    '2': [{ start: '09:00', end: '17:00' }],
    '3': [{ start: '09:00', end: '17:00' }],
    '4': [{ start: '09:00', end: '17:00' }],
    '5': [{ start: '09:00', end: '17:00' }],
    '6': [],
    '7': [],
  });
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State για Εξαιρέσεις
  const [availabilityEffect, setAvailabilityEffect] = useState<'closed' | 'open'>('closed');
  const [reasonCode, setReasonCode] = useState('holiday');
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Φόρτωση Ωραρίου
  useEffect(() => {
    async function loadClinicHours() {
      if (!selectedClinic?.id) return;
      try {
        const res = await api.getSettings(selectedClinic.id);
        const data = res?.settings || res;
        if (data?.working_hours_json && typeof data.working_hours_json === 'object') {
          setWorkingHours(data.working_hours_json);
        }
      } catch (err) {
        console.error('Error loading clinic working hours:', err);
      }
    }
    loadClinicHours();
  }, [selectedClinic?.id]);

  // Αποθήκευση Εβδομαδιαίου Ωραρίου
  const handleSaveWeeklyHours = async () => {
    try {
      setIsSavingHours(true);
      setSuccessMsg('');
      setErrorMsg('');

      const res = await api.getSettings(selectedClinic?.id);
      const data = res?.settings || res || {};

      const payload = {
        ...data,
        working_hours_json: workingHours,
      };

      await api.updateSettings(payload, selectedClinic?.id);
      setSuccessMsg('Το εβδομαδιαίο ωράριο αποθηκεύτηκε με επιτυχία!');
    } catch (err: any) {
      console.error('Error saving weekly hours:', err);
      setErrorMsg(err?.message || 'Αποτυχία αποθήκευσης ωραρίου.');
    } finally {
      setIsSavingHours(false);
    }
  };

  const toggleHistory = async () => {
    const nextState = !showHistory;
    setShowHistory(nextState);
    await fetchClosures(true, nextState);
  };

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
      setStartDate('');
      setEndDate('');
      setNote('');
      
      await fetchClosures(true, showHistory);
    } catch (err) {
      console.error('Error creating exception:', err);
      alert('Σφάλμα κατά τη δημιουργία της εξαίρεσης.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την εξαίρεση;')) return;

    try {
      setIsDeleting(id);
      await api.deleteScheduleException(id, selectedClinic?.id);
      await fetchClosures(true, showHistory);
    } catch (err) {
      console.error('Error deleting exception:', err);
      alert('Αποτυχία διαγραφής.');
    } finally {
      setIsDeleting(null);
    }
  };

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
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Main Header */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              Διαχείριση Ωραρίου & Εξαιρέσεων
            </h1>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ρυθμίστε το εβδομαδιαίο πρόγραμμα λειτουργίας και διαχειριστείτε τις έκτακτες αργίες ή απουσίες.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: ΕΒΔΟΜΑΔΙΑΙΟ ΩΡΑΡΙΟ ΛΕΙΤΟΥΡΓΙΑΣ
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                1. Τακτικό Εβδομαδιαίο Ωράριο
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ορίστε τις ημέρες και τις ώρες που η κλινική δέχεται τακτικά ραντεβού.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingHours || isReadOnly}
            onClick={handleSaveWeeklyHours}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50 text-center shrink-0"
          >
            {isSavingHours ? 'Αποθήκευση...' : 'Αποθήκευση Ωραρίου'}
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-2.5">
          {DAYS_OF_WEEK.map((day) => {
            const slots = workingHours[day.id] || [];
            const isOpen = slots.length > 0;
            const currentSlot = slots[0] || { start: '09:00', end: '17:00' };

            return (
              <div
                key={day.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                  isOpen
                    ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                    : 'bg-slate-50/30 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/80'
                }`}
              >
                {/* Day Checkbox & Name */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`day_check_${day.id}`}
                    checked={isOpen}
                    disabled={isReadOnly}
                    onChange={(e) => {
                      const updated = { ...workingHours };
                      updated[day.id] = e.target.checked ? [{ start: '09:00', end: '17:00' }] : [];
                      setWorkingHours(updated);
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer disabled:opacity-50"
                  />
                  <label htmlFor={`day_check_${day.id}`} className="font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none min-w-[90px]">
                    {day.label}
                  </label>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      isOpen
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isOpen ? 'Ανοιχτά' : 'Κλειστά'}
                  </span>
                </div>

                {/* Friendly Time Selectors */}
                {isOpen ? (
                  <div className="flex items-center gap-2 text-xs font-medium pl-7 sm:pl-0">
                    <span className="text-slate-400 text-[11px]">Από:</span>
                    <select
                      value={currentSlot.start}
                      disabled={isReadOnly}
                      onChange={(e) => {
                        const updated = { ...workingHours };
                        updated[day.id] = [{ start: e.target.value, end: currentSlot.end }];
                        setWorkingHours(updated);
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold outline-none cursor-pointer hover:border-blue-500 transition-colors"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>

                    <span className="text-slate-400 text-[11px] px-1">έως:</span>

                    <select
                      value={currentSlot.end}
                      disabled={isReadOnly}
                      onChange={(e) => {
                        const updated = { ...workingHours };
                        updated[day.id] = [{ start: currentSlot.start, end: e.target.value }];
                        setWorkingHours(updated);
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold outline-none cursor-pointer hover:border-blue-500 transition-colors"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-xs italic pl-7 sm:pl-0">
                    Δεν πραγματοποιούνται ραντεβού
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: ΕΙΔΙΚΕΣ ΕΞΑΙΡΕΣΕΙΣ & ΑΡΓΙΕΣ
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                2. Ειδικές Εξαιρέσεις, Αργίες & Έκτακτες Ώρες ({exceptions?.length || 0})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Προσθέστε μεμονωμένες ημέρες ή περιόδους απουσίας ή έκτακτης λειτουργίας.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={toggleHistory}
              className={`px-3 py-2 font-semibold text-xs rounded-xl border transition-colors flex items-center gap-1.5 ${
                showHistory
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title="Εμφάνιση εξαιρέσεων από τον προηγούμενο μήνα"
            >
              <ArchiveBoxIcon className="w-4 h-4 shrink-0" />
              <span>{showHistory ? 'Απόκρυψη Ιστορικού' : 'Ιστορικό'}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={isActionDisabled}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4 shrink-0" />
              <span>Νέα Εξαίρεση</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
              {isLoading && exceptions?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                    Φόρτωση εξαιρέσεων...
                  </td>
                </tr>
              ) : exceptions && exceptions.length > 0 ? (
                exceptions.map((item) => {
                  const itemId = item.schedule_exception_id || item.id || '';
                  const isClosedEffect = item.availability_effect === 'closed';
                  const isPast = new Date(item.ends_at) < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <tr 
                      key={itemId} 
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isPast ? 'opacity-70 bg-slate-50/30 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-1 font-bold text-[10px] uppercase rounded-md border ${
                              isClosedEffect
                                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                            }`}
                          >
                            {isClosedEffect ? 'Κλειστό / Απουσία' : 'Extra Ωράριο'}
                          </span>
                          {isPast && (
                            <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-semibold">
                              Παρελθόν
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100">
                        {getReasonLabel(item.reason_code)}
                        {item.note && <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">{item.note}</p>}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-600 dark:text-slate-300">{formatDateRange(item)}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteException(itemId)}
                          disabled={isDeleting === itemId || isActionDisabled}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Διαγραφή"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                    Δεν υπάρχουν καταγεγραμμένες εξαιρέσεις.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden p-4 space-y-3">
          {isLoading && exceptions?.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">Φόρτωση...</div>
          ) : exceptions && exceptions.length > 0 ? (
            exceptions.map((item) => {
              const itemId = item.schedule_exception_id || item.id || '';
              const isClosedEffect = item.availability_effect === 'closed';

              return (
                <div key={itemId} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                        isClosedEffect
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      {isClosedEffect ? 'Κλειστό' : 'Extra Ωράριο'}
                    </span>
                    <button
                      onClick={() => handleDeleteException(itemId)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-100">{getReasonLabel(item.reason_code)}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatDateRange(item)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs">Δεν υπάρχουν εξαιρέσεις.</div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL ADD EXCEPTION (WITH FRIENDLY TIME SELECTORS)
         ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                Προσθήκη Νέας Εξαίρεσης
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateException} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Τύπος Εξαίρεσης
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAvailabilityEffect('closed'); setReasonCode('holiday'); }}
                    className={`p-2.5 rounded-xl font-bold border transition-colors ${
                      availabilityEffect === 'closed'
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🚫 Κλείσιμο / Απουσία
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAvailabilityEffect('open'); setReasonCode('extra_hours'); }}
                    className={`p-2.5 rounded-xl font-bold border transition-colors ${
                      availabilityEffect === 'open'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🟢 Extra Ωράριο
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Αιτιολογία
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium outline-none cursor-pointer"
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

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allDayCheck"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                />
                <label htmlFor="allDayCheck" className="font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                  Ολόκληρη Ημέρα (Full-Day)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Από Ημερομηνία
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate) setEndDate(e.target.value);
                    }}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Έως Ημερομηνία
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium outline-none"
                  />
                </div>
              </div>

              {/* Friendly Time Selectors inside Modal */}
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ώρα Έναρξης
                    </label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold outline-none cursor-pointer"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ώρα Λήξης
                    </label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-semibold outline-none cursor-pointer"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Σημείωση / Λεπτομέρειες (Προαιρετικό)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="π.χ. Πάσχα, Επισκευή εξοπλισμού..."
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Αποθήκευση...' : 'Προσθήκη'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}