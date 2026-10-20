'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '@/services/api';
import { 
  TrashIcon, 
  PlusIcon, 
  CalendarIcon, 
  ArchiveBoxIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  XMarkIcon,
  ArrowPathIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

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

const TIME_OPTIONS = Array.from({ length: 33 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
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
  const { isReadOnly, isOwner, selectedClinic, isLoading: isClinicLoading } = useClinic();
  const { closures: exceptions, loadingTab, fetchClosures, settings, fetchSettings } = useDashboard();
  
  const isLoading = isClinicLoading || loadingTab === 'closures' || loadingTab === 'settings';
  const isActionDisabled = isReadOnly || !isOwner;

  const [showHistory, setShowHistory] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [workingHours, setWorkingHours] = useState<Record<string, Array<{ start: string; end: string }>>>({
    '1': [{ start: '09:00', end: '17:00' }],
    '2': [{ start: '09:00', end: '17:00' }],
    '3': [{ start: '09:00', end: '17:00' }],
    '4': [{ start: '09:00', end: '17:00' }],
    '5': [{ start: '09:00', end: '17:00' }],
    '6': [],
    '7': [],
  });
  const [initialWorkingHours, setInitialWorkingHours] = useState<Record<string, Array<{ start: string; end: string }>> | null>(null);

  const [isSavingHours, setIsSavingHours] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [availabilityEffect, setAvailabilityEffect] = useState<'closed' | 'open'>('closed');
  const [reasonCode, setReasonCode] = useState('holiday');
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState('');
  const [showNoteField, setShowNoteField] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prevent infinite fetch loops using function ref pattern
  const fetchSettingsRef = useRef(fetchSettings);
  const fetchClosuresRef = useRef(fetchClosures);

  useEffect(() => {
    fetchSettingsRef.current = fetchSettings;
    fetchClosuresRef.current = fetchClosures;
  }, [fetchSettings, fetchClosures]);

  useEffect(() => {
    if (!isClinicLoading && selectedClinic?.id) {
      fetchSettingsRef.current();
      fetchClosuresRef.current(false, showHistory);
    }
  }, [selectedClinic?.id, isClinicLoading, showHistory]);

  useEffect(() => {
    const data = settings?.settings || settings;
    if (data?.working_hours_json && typeof data.working_hours_json === 'object') {
      setWorkingHours(data.working_hours_json);
      setInitialWorkingHours(data.working_hours_json);
    }
  }, [settings]);

  // Client-side filtering: Current Month / Upcoming vs Past History
  const filteredExceptions = useMemo(() => {
    if (!exceptions || !Array.isArray(exceptions)) return [];

    const now = new Date();
    // Start of the current month (e.g. Oct 1st)
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return exceptions.filter((item) => {
      const itemEnd = new Date(item.ends_at);
      if (showHistory) {
        // Past History: closures that ended before the current month
        return itemEnd < startOfCurrentMonth;
      } else {
        // Current / Upcoming: closures ending within or after the current month
        return itemEnd >= startOfCurrentMonth;
      }
    });
  }, [exceptions, showHistory]);

  const isDirty = useMemo(() => {
    if (!initialWorkingHours) return false;
    return JSON.stringify(workingHours) !== JSON.stringify(initialWorkingHours);
  }, [workingHours, initialWorkingHours]);

  const {
    showPrompt: showNavModal,
    confirmNavigation,
    cancelNavigation,
  } = useUnsavedChangesWarning(isDirty);

  const handleSaveWeeklyHours = async () => {
    if (isActionDisabled || isSavingHours) return;

    try {
      setIsSavingHours(true);
      setSuccessMsg('');
      setErrorMsg('');

      const data = settings?.settings || settings || {};

      const payload = {
        ...data,
        working_hours_json: workingHours,
      };

      await api.updateSettings(payload, selectedClinic?.id);
      await fetchSettingsRef.current(true);
      setInitialWorkingHours(workingHours);
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
    await fetchClosuresRef.current(true, nextState);
  };

  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActionDisabled || isSubmitting) return;

    if (!startDate || !endDate) {
      setErrorMsg('Παρακαλώ συμπληρώστε ημερομηνία έναρξης και λήξης.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

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
      setShowNoteField(false);
      
      await fetchClosuresRef.current(true, showHistory);
      setSuccessMsg('Η νέα εξαίρεση δημιουργήθηκε με επιτυχία!');
    } catch (err: any) {
      console.error('Error creating exception:', err);
      setErrorMsg(err?.message || 'Σφάλμα κατά τη δημιουργία της εξαίρεσης.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    if (isActionDisabled || isDeleting) return;
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την εξαίρεση;')) return;

    try {
      setIsDeleting(id);
      setErrorMsg('');
      await api.deleteScheduleException(id, selectedClinic?.id);
      await fetchClosuresRef.current(true, showHistory);
      setSuccessMsg('Η εξαίρεση διαγράφηκε με επιτυχία.');
    } catch (err: any) {
      console.error('Error deleting exception:', err);
      setErrorMsg(err?.message || 'Αποτυχία διαγραφής.');
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/30 pb-28">
      
      {/* Navigation Guard Modal */}
      {showNavModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 text-amber-600 dark:text-amber-500">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Αποχώρηση από τη σελίδα
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Υπάρχουν μη αποθηκευμένες αλλαγές.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelNavigation}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                aria-label="Κλείσιμο"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#0D121C] p-3 rounded-lg border border-slate-200/60 dark:border-slate-800">
              Εάν αποχωρήσετε τώρα, οι τροποποιήσεις που πραγματοποιήσατε στο εβδομαδιαίο ωράριο θα ακυρωθούν.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cancelNavigation}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Παραμονή
              </button>
              <button
                type="button"
                onClick={confirmNavigation}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                Αποχώρηση χωρίς αποθήκευση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-[#101622] p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Διαχείριση Ωραρίου & Εξαιρέσεων
            </h1>
            {isLoading && (
              <ArrowPathIcon className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ρύθμιση τακτικού εβδομαδιαίου προγράμματος και διαχείριση απουσιών ή έκτακτων αργιών για την επιχείρηση{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClinic?.name}</span>.
          </p>
        </div>
      </div>

      {/* Status Banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2.5" role="status">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2.5" role="alert">
          <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: WEEKLY HOURS */}
      <div className="bg-white dark:bg-[#101622] rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0D121C]">
          <div className="flex items-center gap-2.5">
            <ClockIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                1. Τακτικό Εβδομαδιαίο Ωράριο
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Ορισμός ημερών και ωρών τακτικής λειτουργίας της επιχείρησης.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingHours || isActionDisabled}
            onClick={handleSaveWeeklyHours}
            className={`w-full sm:w-auto px-4 py-2 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 ${
              isDirty
                ? 'bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isSavingHours ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>Αποθήκευση...</span>
              </>
            ) : (
              <span>Αποθήκευση Ωραρίου</span>
            )}
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-2">
          {DAYS_OF_WEEK.map((day) => {
            const slots = workingHours[day.id] || [];
            const isOpen = slots.length > 0;
            const currentSlot = slots[0] || { start: '09:00', end: '17:00' };

            return (
              <div
                key={day.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-3 ${
                  isOpen
                    ? 'bg-slate-50/60 dark:bg-[#0D121C] border-slate-200 dark:border-slate-800/80'
                    : 'bg-white dark:bg-[#101622] border-slate-100 dark:border-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`day_check_${day.id}`}
                    checked={isOpen}
                    disabled={isActionDisabled}
                    onChange={(e) => {
                      const updated = { ...workingHours };
                      updated[day.id] = e.target.checked ? [{ start: '09:00', end: '17:00' }] : [];
                      setWorkingHours(updated);
                    }}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer focus:ring-emerald-500"
                  />
                  <label htmlFor={`day_check_${day.id}`} className="font-semibold text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none min-w-24">
                    {day.label}
                  </label>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${
                      isOpen
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isOpen ? 'Σε λειτουργία' : 'Εκτός λειτουργίας'}
                  </span>
                </div>

                {isOpen ? (
                  <div className="flex items-center gap-2 text-xs font-medium pl-7 sm:pl-0">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Από:</span>
                    <select
                      value={currentSlot.start}
                      disabled={isActionDisabled}
                      onChange={(e) => {
                        const updated = { ...workingHours };
                        updated[day.id] = [{ start: e.target.value, end: currentSlot.end }];
                        setWorkingHours(updated);
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium outline-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>

                    <span className="text-slate-500 dark:text-slate-400 text-[11px] px-1">έως:</span>

                    <select
                      value={currentSlot.end}
                      disabled={isActionDisabled}
                      onChange={(e) => {
                        const updated = { ...workingHours };
                        updated[day.id] = [{ start: currentSlot.start, end: e.target.value }];
                        setWorkingHours(updated);
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium outline-none cursor-pointer hover:border-emerald-500 focus:border-emerald-500 transition-colors"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-xs pl-7 sm:pl-0">
                    Κλειστά
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: SCHEDULE EXCEPTIONS */}
      <div className="bg-white dark:bg-[#101622] rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-xs dark:shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0D121C]">
          <div className="flex items-center gap-2.5">
            <CalendarDaysIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                2. {showHistory ? 'Ιστορικό Εξαιρέσεων' : 'Τρέχουσες & Επερχόμενες Εξαιρέσεις'} ({filteredExceptions.length})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {showHistory
                  ? 'Προβολή παλαιότερων εξαιρέσεων και αργιών.'
                  : 'Διαχείριση ενεργών απουσιών, αργιών ή εκτάκτων ωρών του τρέχοντος μηνός και επερχόμενων.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={toggleHistory}
              className={`px-3 py-1.5 font-semibold text-xs rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
                showHistory
                  ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <ArchiveBoxIcon className="w-4 h-4 shrink-0" />
              <span>{showHistory ? 'Προβολή Ενεργών' : 'Ιστορικό'}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={isActionDisabled}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4 shrink-0 stroke-[2.5]" />
              <span>Νέα Εξαίρεση</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 dark:bg-[#0D121C] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800/80 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-3.5">Κατάσταση</th>
                <th className="p-3.5">Αιτιολογία</th>
                <th className="p-3.5">Διάρκεια</th>
                <th className="p-3.5 text-right">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {isLoading && filteredExceptions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <ArrowPathIcon className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Φόρτωση δεδομένων...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredExceptions.length > 0 ? (
                filteredExceptions.map((item) => {
                  const itemId = item.schedule_exception_id || item.id || '';
                  const isClosedEffect = item.availability_effect === 'closed';
                  const isPast = new Date(item.ends_at) < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <tr 
                      key={itemId} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                        isPast ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 font-semibold text-[11px] rounded-md border ${
                              isClosedEffect
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                            }`}
                          >
                            {isClosedEffect ? 'Κλειστό' : 'Έκτακτο Ωράριο'}
                          </span>
                          {isPast && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              Ολοκληρώθηκε
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        {getReasonLabel(item.reason_code)}
                        {item.note && <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">{item.note}</p>}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{formatDateRange(item)}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteException(itemId)}
                          disabled={isDeleting === itemId || isActionDisabled}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-40"
                          title="Διαγραφή"
                          aria-label="Διαγραφή εξαίρεσης"
                        >
                          {isDeleting === itemId ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin text-rose-500" />
                          ) : (
                            <TrashIcon className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 dark:text-slate-500 font-medium">
                    {showHistory ? 'Δεν υπάρχουν παλαιότερες εξαιρέσεις στο ιστορικό.' : 'Δεν υπάρχουν ενεργές ή επερχόμενες εξαιρέσεις.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-3">
          {isLoading && filteredExceptions.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">Φόρτωση...</div>
          ) : filteredExceptions.length > 0 ? (
            filteredExceptions.map((item) => {
              const itemId = item.schedule_exception_id || item.id || '';
              const isClosedEffect = item.availability_effect === 'closed';

              return (
                <div key={itemId} className="p-3.5 bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${
                        isClosedEffect
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      {isClosedEffect ? 'Κλειστό' : 'Έκτακτο Ωράριο'}
                    </span>
                    <button
                      onClick={() => handleDeleteException(itemId)}
                      disabled={isDeleting === itemId || isActionDisabled}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      aria-label="Διαγραφή εξαίρεσης"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">{getReasonLabel(item.reason_code)}</div>
                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatDateRange(item)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs">
              {showHistory ? 'Δεν υπάρχουν παλαιότερες εξαιρέσεις στο ιστορικό.' : 'Δεν υπάρχουν ενεργές ή επερχόμενες εξαιρέσεις.'}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Bar for Unsaved Changes */}
      {isDirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-200 truncate">
              Υπάρχουν μη αποθηκευμένες αλλαγές στο ωράριο
            </p>
          </div>

          <button
            type="button"
            disabled={isSavingHours || isActionDisabled}
            onClick={handleSaveWeeklyHours}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isSavingHours ? (
              <>
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                <span>Αποθήκευση...</span>
              </>
            ) : (
              <span>Αποθήκευση</span>
            )}
          </button>
        </div>
      )}

      {/* ADD EXCEPTION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-[#101622] text-slate-900 dark:text-slate-100 rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Δημιουργία Νέας Εξαίρεσης
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Κλείσιμο"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateException} className="space-y-6">
              {/* 2-Column Grid Input Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Column 1: Type Selection */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Τύπος Εξαίρεσης
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-[#0D121C] rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAvailabilityEffect('closed')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        availabilityEffect === 'closed'
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Κλειστό
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvailabilityEffect('open')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        availabilityEffect === 'open'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Έκτακτο Ωράριο
                    </button>
                  </div>
                </div>

                {/* Column 2: Reason Select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Αιτιολογία
                  </label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs font-medium rounded-xl bg-white dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="holiday">Επίσημη Αργία</option>
                    <option value="vacation">Διακοπές</option>
                    <option value="personal">Προσωπικός Λόγος / Απουσία</option>
                    <option value="staff_absence">Απουσία Προσωπικού</option>
                    <option value="extra_hours">Έκτακτο Ωράριο</option>
                    <option value="closed">Κλειστό</option>
                    <option value="other">Άλλο</option>
                  </select>
                </div>

                {/* Date Selection Row */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Ημερομηνία Έναρξης
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 text-xs font-medium rounded-xl bg-white dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Ημερομηνία Λήξης
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 text-xs font-medium rounded-xl bg-white dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Custom Hours Option (Shown if NOT All Day) */}
                {!isAllDay && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Ώρα Έναρξης
                      </label>
                      <select
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full h-10 px-3.5 text-xs font-medium rounded-xl bg-white dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Ώρα Λήξης
                      </label>
                      <select
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full h-10 px-3.5 text-xs font-medium rounded-xl bg-white dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Optional Note Field */}
              {showNoteField && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Σημείωση / Λεπτομέρειες
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Επιπλέον διευκρινίσεις..."
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl bg-white dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 resize-none transition-colors"
                  />
                </div>
              )}

              {/* Modal Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                
                {/* Option Toggles */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAllDay(!isAllDay)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      isAllDay
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200'
                        : 'bg-white dark:bg-[#0D121C] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <ClockIcon className="w-4 h-4 shrink-0" />
                    <span>{isAllDay ? 'Ολόκληρη Ημέρα' : 'Ειδικό Ωράριο'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNoteField(!showNoteField)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      showNoteField || note
                        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200'
                        : 'bg-white dark:bg-[#0D121C] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <ChatBubbleBottomCenterTextIcon className="w-4 h-4 shrink-0" />
                    <span>Σημείωση</span>
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>Δημιουργία...</span>
                    </>
                  ) : (
                    <span>Δημιουργία Εξαίρεσης</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}