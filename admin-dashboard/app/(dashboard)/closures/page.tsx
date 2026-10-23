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
  ChatBubbleBottomCenterTextIcon,
  NoSymbolIcon,
  SparklesIcon
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

  const filteredExceptions = useMemo(() => {
    if (!exceptions || !Array.isArray(exceptions)) return [];

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return exceptions.filter((item) => {
      const itemEnd = new Date(item.ends_at);
      if (showHistory) {
        return itemEnd < startOfCurrentMonth;
      } else {
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

  const validateSlotsOverlap = (slots: Array<{ start: string; end: string }>) => {
    const toMinutes = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    for (let i = 0; i < slots.length; i++) {
      const startI = toMinutes(slots[i].start);
      const endI = toMinutes(slots[i].end);

      if (startI >= endI) {
        return 'Η ώρα έναρξης πρέπει να είναι προγενέστερη της λήξης σε κάθε διάστημα.';
      }

      for (let j = i + 1; j < slots.length; j++) {
        const startJ = toMinutes(slots[j].start);
        const endJ = toMinutes(slots[j].end);

        if (Math.max(startI, startJ) < Math.min(endI, endJ)) {
          return 'Τα χρονικά διαστήματα δεν επιτρέπεται να επικαλύπτονται.';
        }
      }
    }
    return null;
  };

  const handleSaveWeeklyHours = async () => {
    if (isActionDisabled || isSavingHours) return;

    for (const day of DAYS_OF_WEEK) {
      const slots = workingHours[day.id] || [];
      const error = validateSlotsOverlap(slots);
      if (error) {
        setErrorMsg(`[${day.label}]: ${error}`);
        return;
      }
    }

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
    <div className="space-y-4 max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-5 text-slate-900 dark:text-slate-100 font-sans pb-24">
      
      {showNavModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 max-w-sm w-full shadow-2xl space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-500 min-w-0 pr-2">
                <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  Μη αποθηκευμένες αλλαγές
                </h3>
              </div>
              <button
                type="button"
                onClick={cancelNavigation}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer shrink-0"
                aria-label="Κλείσιμο"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Εάν αποχωρήσετε τώρα, οι τροποποιήσεις στο εβδομαδιαίο ωράριο θα χαθούν.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={cancelNavigation}
                className="px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
              >
                Παραμονή
              </button>
              <button
                type="button"
                onClick={confirmNavigation}
                className="px-3 py-1.5 rounded-xl text-[11px] font-medium bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Αποχώρηση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="bg-white dark:bg-[#101622] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              Διαχείριση Ωραρίου & Εξαιρέσεων
            </h1>
            {isLoading && <ArrowPathIcon className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Κλινική: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClinic?.name}</span>
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2" role="status">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2" role="alert">
          <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: WEEKLY HOURS (REDESIGNED INLINE BOXES) */}
      <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0D121C]">
          <div className="flex items-center gap-2 min-w-0">
            <ClockIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider truncate">
              1. Τακτικό Εβδομαδιαίο Ωράριο
            </h2>
          </div>

          <button
            type="button"
            disabled={isSavingHours || isActionDisabled}
            onClick={handleSaveWeeklyHours}
            className={`w-full sm:w-auto px-3.5 py-1.5 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 ${
              isDirty
                ? 'bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {isSavingHours ? (
              <>
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                <span>Αποθήκευση...</span>
              </>
            ) : (
              <span>Αποθήκευση Ωραρίου</span>
            )}
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-2">
          {DAYS_OF_WEEK.map((day) => {
            const slots = workingHours[day.id] || [];
            const isOpen = slots.length > 0;

            return (
              <div
                key={day.id}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                  isOpen
                    ? 'bg-slate-50/60 dark:bg-[#0D121C] border-slate-200 dark:border-slate-800/80'
                    : 'bg-white dark:bg-[#101622] border-slate-100 dark:border-slate-800/50'
                }`}
              >
                {/* Single Compact Flow Container */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  
                  {/* Left Controls: Checkbox & Day Name & Status Badge */}
                  <div className="flex items-center gap-2 shrink-0 pr-1">
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
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer focus:ring-emerald-500 shrink-0"
                    />
                    <label htmlFor={`day_check_${day.id}`} className="font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none min-w-16">
                      {day.label}
                    </label>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border shrink-0 ${
                        isOpen
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isOpen ? `${slots.length} ${slots.length === 1 ? 'Διάστημα' : 'Διαστήματα'}` : 'Κλειστά'}
                    </span>
                  </div>

                  {/* Middle / Right: Time Slots Dropdowns Inline */}
                  {isOpen ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {slots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-1.5 bg-white dark:bg-slate-900/90 p-1 px-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium shrink-0">
                          <span className="text-slate-400 text-[10px] font-mono">#{index + 1}</span>
                          <span className="text-slate-400 text-[10px]">Από:</span>
                          <select
                            value={slot.start}
                            disabled={isActionDisabled}
                            onChange={(e) => {
                              const updated = { ...workingHours };
                              const newSlots = [...slots];
                              newSlots[index] = { ...newSlots[index], start: e.target.value };
                              updated[day.id] = newSlots;
                              setWorkingHours(updated);
                            }}
                            className="px-1.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold outline-none cursor-pointer hover:border-emerald-500"
                          >
                            {TIME_OPTIONS.map((time) => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>

                          <span className="text-slate-400 text-[10px]">έως:</span>

                          <select
                            value={slot.end}
                            disabled={isActionDisabled}
                            onChange={(e) => {
                              const updated = { ...workingHours };
                              const newSlots = [...slots];
                              newSlots[index] = { ...newSlots[index], end: e.target.value };
                              updated[day.id] = newSlots;
                              setWorkingHours(updated);
                            }}
                            className="px-1.5 py-1 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-semibold outline-none cursor-pointer hover:border-emerald-500"
                          >
                            {TIME_OPTIONS.map((time) => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>

                          {slots.length > 1 && !isActionDisabled && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = { ...workingHours };
                                updated[day.id] = slots.filter((_, i) => i !== index);
                                setWorkingHours(updated);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Διαγραφή διαστήματος"
                              aria-label="Διαγραφή διαστήματος"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add Slot Button inline next to slots */}
                      {!isActionDisabled && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...workingHours };
                            updated[day.id] = [...slots, { start: '17:00', end: '19:00' }];
                            setWorkingHours(updated);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                        >
                          <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Προσθήκη διαστήματος</span>
                        </button>
                      )}
                    </div>
                  ) : null}

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: EXCEPTIONS */}
      <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0D121C]">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDaysIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider truncate">
              2. {showHistory ? 'Ιστορικό Εξαιρέσεων' : 'Εξαιρέσεις & Αργίες'} ({filteredExceptions.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
            <button
              onClick={toggleHistory}
              className={`flex-1 sm:flex-initial px-3 py-1.5 font-semibold text-xs rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                showHistory
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 border-slate-300'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <ArchiveBoxIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{showHistory ? 'Ενεργές' : 'Ιστορικό'}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={isActionDisabled}
              className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
              <span>Νέα Εξαίρεση</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-150">
            <thead className="bg-slate-50/80 dark:bg-[#0D121C] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800/80 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Κατάσταση</th>
                <th className="p-3">Αιτιολογία</th>
                <th className="p-3">Διάρκεια</th>
                <th className="p-3 text-right">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {isLoading && filteredExceptions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <ArrowPathIcon className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Φόρτωση...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredExceptions.length > 0 ? (
                filteredExceptions.map((item) => {
                  const itemId = item.schedule_exception_id || item.id || '';
                  const isClosedEffect = item.availability_effect === 'closed';

                  return (
                    <tr key={itemId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 font-semibold text-[10px] rounded-md border ${
                            isClosedEffect
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                          }`}
                        >
                          {isClosedEffect ? 'Κλειστό' : 'Έκτακτο'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {getReasonLabel(item.reason_code)}
                        {item.note && <p className="text-[10px] font-normal text-slate-500 mt-0.5">{item.note}</p>}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap text-[11px]">{formatDateRange(item)}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteException(itemId)}
                          disabled={isDeleting === itemId || isActionDisabled}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-40"
                          title="Διαγραφή"
                          aria-label="Διαγραφή εξαίρεσης"
                        >
                          {isDeleting === itemId ? (
                            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin text-rose-500" />
                          ) : (
                            <TrashIcon className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 text-xs">
                    Δεν βρέθηκαν εγγραφές.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden p-3 space-y-2.5">
          {isLoading && filteredExceptions.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">Φόρτωση...</div>
          ) : filteredExceptions.length > 0 ? (
            filteredExceptions.map((item) => {
              const itemId = item.schedule_exception_id || item.id || '';
              const isClosedEffect = item.availability_effect === 'closed';

              return (
                <div key={itemId} className="p-3 bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                        isClosedEffect
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      {isClosedEffect ? 'Κλειστό' : 'Έκτακτο'}
                    </span>
                    <button
                      onClick={() => handleDeleteException(itemId)}
                      disabled={isDeleting === itemId || isActionDisabled}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      aria-label="Διαγραφή"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{getReasonLabel(item.reason_code)}</div>
                  {item.note && <div className="text-[11px] text-slate-500">{item.note}</div>}
                  <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <CalendarIcon className="w-3 h-3 shrink-0" />
                    <span>{formatDateRange(item)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-slate-400 text-xs">Δεν βρέθηκαν εγγραφές.</div>
          )}
        </div>
      </div>

      {isDirty && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1rem)] max-w-md bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-200 truncate">
              Μη αποθηκευμένες αλλαγές στο ωράριο
            </p>
          </div>

          <button
            type="button"
            disabled={isSavingHours || isActionDisabled}
            onClick={handleSaveWeeklyHours}
            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isSavingHours ? 'Αποθήκευση...' : 'Αποθήκευση'}
          </button>
        </div>
      )}

      {/* ADD EXCEPTION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-[#101622] text-slate-900 dark:text-slate-100 rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Νέα Εξαίρεση / Αργία</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
                aria-label="Κλείσιμο"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateException} className="space-y-3.5">
              
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Είδος επίδρασης
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAvailabilityEffect('closed');
                      setReasonCode('holiday');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      availabilityEffect === 'closed'
                        ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-bold'
                        : 'bg-slate-50 dark:bg-[#0D121C] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-xs">Κλειστό</span>
                    <NoSymbolIcon className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAvailabilityEffect('open');
                      setReasonCode('extra_hours');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      availabilityEffect === 'open'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold'
                        : 'bg-slate-50 dark:bg-[#0D121C] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="text-xs">Έκτακτο</span>
                    <SparklesIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Αιτιολογία
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                >
                  {availabilityEffect === 'closed' ? (
                    <>
                      <option value="holiday">Επίσημη Αργία</option>
                      <option value="vacation">Διακοπές / Άδεια</option>
                      <option value="personal">Προσωπικός Λόγος</option>
                      <option value="staff_absence">Απουσία Προσωπικού</option>
                      <option value="closed">Γενικό Κλείσιμο</option>
                      <option value="other">Άλλο</option>
                    </>
                  ) : (
                    <>
                      <option value="extra_hours">Έκτακτες Ώρες</option>
                      <option value="other">Άλλο</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Ημερομηνίες
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate) setEndDate(e.target.value);
                    }}
                    required
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Χρονικό διάστημα ημέρας
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAllDay(!isAllDay)}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {isAllDay ? 'Συγκεκριμένες ώρες' : 'Ολόκληρη ημέρα'}
                  </button>
                </div>

                {!isAllDay && (
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 rounded-xl">
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-9 px-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-9 px-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    >
                      {TIME_OPTIONS.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setShowNoteField(!showNoteField)}
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 flex items-center gap-1 cursor-pointer"
                >
                  <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{showNoteField ? 'Απόκρυψη σημείωσης' : '+ Σημείωση'}</span>
                </button>

                {showNoteField && (
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Προαιρετική σημείωση..."
                    className="w-full p-2.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 outline-none resize-none"
                  />
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  Ακύρωση
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Αποθήκευση...' : 'Δημιουργία'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}