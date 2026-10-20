'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Appointment } from '@/types';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';
import { 
  XMarkIcon, 
  UserIcon, 
  PhoneIcon, 
  CalendarIcon, 
  TagIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  PencilSquareIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface EditAppointmentModalProps {
  appointment: Appointment;
  onClose: () => void;
  onStateChange: () => void;
}

const DEFAULT_APPOINTMENT_TYPES = [
  { code: 'checkup', name: 'Εξέταση / Έλεγχος', duration_minutes: 30 },
  { code: 'cleaning', name: 'Καθαρισμός', duration_minutes: 45 },
  { code: 'filling', name: 'Σφράγισμα', duration_minutes: 30 },
  { code: 'emergency', name: 'Έκτακτο', duration_minutes: 20 },
  { code: 'pain', name: 'Οξύς Πόνος', duration_minutes: 30 },
  { code: 'whitening', name: 'Λεύκανση', duration_minutes: 60 },
  { code: 'consultation', name: 'Συμβουλευτική', duration_minutes: 20 },
];

const GREEK_LABEL_MAP: Record<string, string> = {
  checkup: 'Εξέταση / Έλεγχος',
  cleaning: 'Καθαρισμός',
  filling: 'Σφράγισμα',
  emergency: 'Έκτακτο',
  pain: 'Οξύς Πόνος',
  whitening: 'Λεύκανση',
  consultation: 'Συμβουλευτική',
  general: 'Γενικό Ραντεβού',
  examination: 'Εξέταση',
  other: 'Άλλο',
  unknown: 'Γενικό Ραντεβού',
};

const getLocalDatetime = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function EditAppointmentModal({ appointment, onClose, onStateChange }: EditAppointmentModalProps) {
  const { selectedClinic } = useClinic();
  const appointmentId = appointment.appointment_id || (appointment as any).id;

  const initialName = appointment.caller_name || (appointment as any).patient_name || (appointment as any).patient?.name || '';
  const initialPhone = (appointment as any).phone_normalized || (appointment as any).callback_phone_normalized || appointment.phone || '';
  const initialTypeCode = appointment.appointment_type_code || 'examination';
  const initialStatus = appointment.status || 'booked';
  
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [typeCode, setTypeCode] = useState(initialTypeCode);
  const [status, setStatus] = useState<string>(initialStatus);
  const [startAt, setStartAt] = useState(getLocalDatetime(appointment.start_at));
  
  const [appointmentTypesList, setAppointmentTypesList] = useState<
    Array<{ code: string; name: string; duration_minutes: number }>
  >(DEFAULT_APPOINTMENT_TYPES);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Selected appointment duration based on type code
  const currentDuration = useMemo(() => {
    const selectedType = appointmentTypesList.find((t) => t.code === typeCode);
    return selectedType ? selectedType.duration_minutes : appointment.duration_minutes || 30;
  }, [typeCode, appointmentTypesList, appointment.duration_minutes]);

  // Load Clinic Settings
  useEffect(() => {
    async function fetchClinicSettings() {
      if (!selectedClinic?.id) return;
      try {
        const res = await api.getSettings(selectedClinic.id);
        const data = res?.settings || res;

        if (data) {
          let parsedTypes: Array<{ code: string; name: string; duration_minutes: number }> = [];

          if (Array.isArray(data.appointment_types) && data.appointment_types.length > 0) {
            parsedTypes = data.appointment_types.map((t: any) => ({
              code: t.code || t.id,
              name: t.name || t.title || GREEK_LABEL_MAP[t.code] || t.code,
              duration_minutes: Number(t.duration_minutes || t.duration) || 30,
            }));
          } else {
            const durations = data.appointment_duration_minutes_json || {};
            const preps = data.appointment_preparation_json || {};
            const keys = Array.from(new Set([...Object.keys(durations), ...Object.keys(preps)]));

            if (keys.length > 0) {
              parsedTypes = keys.map((key) => {
                const rawPrep = preps[key] || '';
                let parsedTitle = GREEK_LABEL_MAP[key] || key.replace(/_/g, ' ');

                if (typeof rawPrep === 'string' && rawPrep.startsWith('[TITLE:')) {
                  const match = rawPrep.match(/^\[TITLE:\s*([\s\S]*?)\]/);
                  if (match && match[1]) {
                    parsedTitle = match[1];
                  }
                }

                return {
                  code: key,
                  name: parsedTitle,
                  duration_minutes: Number(durations[key]) || 30,
                };
              });
            }
          }

          if (parsedTypes.length > 0) {
            setAppointmentTypesList(parsedTypes);
            const currentExists = parsedTypes.some((t) => t.code === typeCode);
            if (!currentExists && parsedTypes.length > 0) {
              setTypeCode(parsedTypes[0].code);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load clinic settings:', err);
      }
    }

    fetchClinicSettings();
  }, [selectedClinic?.id, typeCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId) return;

    try {
      setIsSubmitting(true);
      setError('');

      // 1. Handle Cancellation
      if (status === 'cancelled' && initialStatus !== 'cancelled') {
        await api.cancelAppointment(appointmentId, selectedClinic?.id);
        onStateChange();
        onClose();
        return;
      }

      const isDateChanged = startAt !== getLocalDatetime(appointment.start_at);
      const newStartIso = new Date(startAt).toISOString();

      // 2. Handle Reschedule using direct endpoint
      if (isDateChanged) {
        await api.rescheduleAppointment(
          appointmentId, 
          { start_at: newStartIso, duration_minutes: currentDuration },
          selectedClinic?.id
        );
      }

      onStateChange();
      onClose();
    } catch (err: any) {
      console.error('Error updating appointment:', err);
      setError(err?.message || 'Η ενημέρωση απέτυχε. Παρακαλώ ελέγξτε τη διαθεσιμότητα.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 transition-all transform animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl">
              <PencilSquareIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Διαχείριση Ραντεβού
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ενημέρωση στοιχείων ή μεταβολή ώρας
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            disabled={isSubmitting}
            aria-label="Κλείσιμο"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            role="alert"
            className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2 font-medium"
          >
            <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Caller Name (Read-Only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Ασθενής
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200">
                <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{name || 'Ανώνυμος'}</span>
              </div>
            </div>

            {/* Phone (Read-Only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Τηλέφωνο
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono font-medium text-slate-800 dark:text-slate-200">
                <PhoneIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{phone || '-'}</span>
              </div>
            </div>
          </div>

          {/* Date & Time Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Ημερομηνία & Ώρα
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-colors scheme-light dark:scheme-dark"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Appointment Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Τύπος Ραντεβού
              </label>
              <select
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-colors"
              >
                {appointmentTypesList.map((type) => (
                  <option key={type.code} value={type.code} className="dark:bg-slate-900">
                    {type.name} ({type.duration_minutes} λ.)
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Κατάσταση
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-100 transition-colors"
              >
                <option value="booked" className="dark:bg-slate-900">Ενεργό / Booked</option>
                <option value="cancelled" className="dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-semibold">
                  Ακύρωση Ραντεβού
                </option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer ${
                status === 'cancelled' 
                  ? 'bg-rose-600 hover:bg-rose-700' 
                  : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900'
              }`}
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Αποθήκευση...</span>
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  <span>{status === 'cancelled' ? 'Επιβεβαίωση Ακύρωσης' : 'Αποθήκευση Αλλαγών'}</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}