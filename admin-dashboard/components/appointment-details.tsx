'use client';

import React, { useState, useEffect } from 'react';
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
  PencilSquareIcon
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

// Βοηθητική συνάρτηση για να μετατρέπουμε το ISO string σε format που καταλαβαίνει το <input type="datetime-local">
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
  
  // Δυναμική λίστα τύπων ραντεβού από τα Settings
  const [appointmentTypesList, setAppointmentTypesList] = useState<
    Array<{ code: string; name: string; duration_minutes: number }>
  >(DEFAULT_APPOINTMENT_TYPES);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Φόρτωση ρυθμίσεων κλινικής & συγχρονισμός τύπων ραντεβού
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

            // Αν ο τύπος του υπάρχοντος ραντεβού δεν υπάρχει πλέον στη λίστα, θέτουμε τον πρώτο διαθέσιμο
            const currentExists = parsedTypes.some((t) => t.code === typeCode);
            if (!currentExists && parsedTypes.length > 0) {
              setTypeCode(parsedTypes[0].code);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load appointment types from settings in edit modal:', err);
      }
    }

    fetchClinicSettings();
  }, [selectedClinic?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId) return;

    try {
      setIsSubmitting(true);
      setError('');

      // Σενάριο 1: Ο χρήστης θέλει απλώς να ακυρώσει το ραντεβού
      if (status === 'cancelled' && initialStatus !== 'cancelled') {
        await api.cancelAppointment(appointmentId);
        onStateChange();
        onClose();
        return;
      }

      // Ελέγχουμε αν άλλαξε κάτι στα δεδομένα
      const isDateChanged = startAt !== getLocalDatetime(appointment.start_at);
      const isDetailsChanged = name !== initialName || phone !== initialPhone || typeCode !== initialTypeCode;

      if (isDateChanged || isDetailsChanged) {
        const newStartIso = new Date(startAt).toISOString();

        // 1. Αν άλλαξε η ώρα, ελέγχουμε πρώτα τη διαθεσιμότητα
        if (isDateChanged) {
          const availability = await api.checkAvailability(
            { starts_at: newStartIso },
            selectedClinic?.id
          );
          if (availability && availability.available === false) {
            setError('Η επιλεγμένη ημερομηνία/ώρα δεν είναι διαθέσιμη.');
            setIsSubmitting(false);
            return;
          }
        }

        // 2. Ακυρώνουμε το παλιό ραντεβού (αφού δεν υπάρχει update endpoint)
        await api.cancelAppointment(appointmentId);

        // 3. Δημιουργούμε το νέο (αναθεωρημένο) ραντεβού
        await api.createAppointment({
          clinic_id: selectedClinic?.id,
          caller_name: name,
          phone: phone,
          appointment_type_code: typeCode,
          start_at: newStartIso,
          status: 'booked',
          notes: (appointment as any).notes || '', 
        }, selectedClinic?.id);
      }

      onStateChange();
      onClose();
    } catch (err: any) {
      console.error('Σφάλμα κατά την ενημέρωση του ραντεβού:', err);
      setError(err?.message || 'Η αποθήκευση απέτυχε. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-blue-100 dark:border-slate-800 p-6 flex flex-col justify-between transition-colors animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-50 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 rounded-xl">
              <PencilSquareIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Διαχείριση Ραντεβού
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800"
            disabled={isSubmitting}
            aria-label="Κλείσιμο"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2 font-medium">
            <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ονοματεπώνυμο */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <UserIcon className="w-3.5 h-3.5" /> Ασθενής
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-blue-50/30 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Τηλέφωνο */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <PhoneIcon className="w-3.5 h-3.5" /> Τηλέφωνο
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/30 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Ημερομηνία & Ώρα */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5 mb-1">
              <CalendarIcon className="w-3.5 h-3.5" /> Ημερομηνία & Ώρα
            </label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
              className="w-full px-3 py-2 bg-blue-50/30 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 scheme-light dark:scheme-dark"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Τύπος Ραντεβού (Δυναμικός από τα Settings) */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <TagIcon className="w-3.5 h-3.5" /> Τύπος Ραντεβού
              </label>
              <select
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/30 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {appointmentTypesList.map((type) => (
                  <option key={type.code} value={type.code} className="dark:bg-slate-900">
                    {type.name} ({type.duration_minutes} λ.)
                  </option>
                ))}
              </select>
            </div>

            {/* Κατάσταση (Status) */}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                Κατάσταση
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/30 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="booked" className="dark:bg-slate-900">Booked / Ενεργό</option>
                <option value="cancelled" className="dark:bg-slate-900 text-rose-600">Ακυρωμένο</option>
              </select>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-blue-50 dark:border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors"
            >
              Κλείσιμο
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <CheckIcon className="w-4 h-4" />
              {isSubmitting ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}