'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';

interface CreateAppointmentModalProps {
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onSuccess: () => void;
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
  other: 'Άλλο',
  unknown: 'Γενικό Ραντεβού',
};

export default function CreateAppointmentModal({
  initialDate = '',
  initialTime = '09:00',
  onClose,
  onSuccess,
}: CreateAppointmentModalProps) {
  const { selectedClinic } = useClinic();
  const [callerName, setCallerName] = useState('');
  const [phone, setPhone] = useState('');
  const [appointmentType, setAppointmentType] = useState('checkup');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialTime);
  const [durationMinutes, setDurationMinutes] = useState(30);

  // Δυναμική λίστα τύπων ραντεβού από τα Settings με άμεσο fallback
  const [appointmentTypesList, setAppointmentTypesList] = useState<
    Array<{ code: string; name: string; duration_minutes: number }>
  >(DEFAULT_APPOINTMENT_TYPES);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ starts_at: string; ends_at: string }>>([]);

  // Φόρτωση των ρυθμίσεων της κλινικής & συγχρονισμός τύπων ραντεβού
  useEffect(() => {
    async function fetchClinicSettings() {
      if (!selectedClinic?.id) return;
      try {
        const res = await api.getSettings(selectedClinic.id);
        const data = res?.settings || res;

        if (data) {
          // Υποστήριξη για διάφορες πιθανές δομές από το backend (π.χ. appointment_types array ή JSON maps)
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

            // Έλεγχος αν ο τρέχων τύπος υπάρχει στη νέα λίστα, αλλιώς βάζουμε τον πρώτο
            const currentExists = parsedTypes.some((t) => t.code === appointmentType);
            if (!currentExists) {
              setAppointmentType(parsedTypes[0].code);
              setDurationMinutes(parsedTypes[0].duration_minutes);
            } else {
              const matched = parsedTypes.find((t) => t.code === appointmentType);
              if (matched) setDurationMinutes(matched.duration_minutes);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load appointment types from settings:', err);
      }
    }

    fetchClinicSettings();
  }, [selectedClinic?.id]);

  // Όταν αλλάζει ο τύπος ραντεβού, ενημερώνουμε αυτόματα τη διάρκεια
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    setAppointmentType(selectedCode);

    const foundType = appointmentTypesList.find((t) => t.code === selectedCode);
    if (foundType) {
      setDurationMinutes(foundType.duration_minutes);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvailabilityError(null);
    setSuggestions([]);

    if (!date || !time) return;

    try {
      setIsSubmitting(true);
      const startsAtISO = new Date(`${date}T${time}:00`).toISOString();

      // 1. Έλεγχος Διαθεσιμότητας
      try {
        const checkRes = await api.checkAvailability(
          { starts_at: startsAtISO, duration_minutes: durationMinutes },
          selectedClinic?.id
        );

        if (checkRes && checkRes.available === false) {
          setAvailabilityError(checkRes.reason || 'Η επιλεγμένη ώρα δεν είναι διαθέσιμη.');
          if (Array.isArray(checkRes.suggestions)) {
            setSuggestions(checkRes.suggestions);
          }
          setIsSubmitting(false);
          return;
        }
      } catch (checkErr) {
        console.warn('Availability check skipped:', checkErr);
      }

      // 2. Δημιουργία Ραντεβού
      const payload = {
        clinic_id: selectedClinic?.id,
        caller_name: callerName,
        phone: phone,
        appointment_type_code: appointmentType,
        start_at: startsAtISO,
        duration_minutes: durationMinutes,
        status: 'booked',
      };

      await api.createAppointment(payload, selectedClinic?.id);
      onSuccess();
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      setAvailabilityError(err?.message || 'Σφάλμα κατά τη δημιουργία του ραντεβού.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSuggestion = (isoString: string) => {
    const suggestedDate = new Date(isoString);
    const dateStr = suggestedDate.toISOString().split('T')[0];
    const hours = String(suggestedDate.getHours()).padStart(2, '0');
    const minutes = String(suggestedDate.getMinutes()).padStart(2, '0');

    setDate(dateStr);
    setTime(`${hours}:${minutes}`);
    setAvailabilityError(null);
    setSuggestions([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Νέο Ραντεβού</h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
          >
            ✕
          </button>
        </div>

        {availabilityError && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs rounded-xl space-y-2">
            <p className="font-semibold">⚠️ {availabilityError}</p>
            {suggestions.length > 0 && (
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-300 mb-1">Προτεινόμενες εναλλακτικές ώρες:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, i) => {
                    const d = new Date(sug.starts_at);
                    const timeLabel = d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug.starts_at)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-lg text-[11px] font-bold transition-colors"
                      >
                        {timeLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ονοματεπώνυμο Ασθενή</label>
            <input
              type="text"
              required
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Τηλέφωνο Επικοινωνίας</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Τύπος Ραντεβού</label>
              <span className="text-slate-400 dark:text-slate-500 text-[11px]">Διάρκεια: {durationMinutes} λεπτά</span>
            </div>
            <select
              value={appointmentType}
              onChange={handleTypeChange}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {appointmentTypesList.map((type) => (
                <option key={type.code} value={type.code} className="dark:bg-slate-800 dark:text-slate-100">
                  {type.name} ({type.duration_minutes} λ.)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ημερομηνία</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ώρα</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}