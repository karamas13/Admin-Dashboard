'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';
import { ClockIcon } from '@heroicons/react/24/outline';

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

// Προτεινόμενες δημοφιλείς ώρες για γρήγορη επιλογή
const QUICK_TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', 
  '17:00', '18:00', '19:00', '20:00'
];

// Λίστα ωρών (08:00 - 21:00)
const HOURS_OPTIONS = Array.from({ length: 14 }, (_, i) => String(i + 8).padStart(2, '0'));
// Λίστα λεπτών (με βήμα 15')
const MINUTES_OPTIONS = ['00', '15', '30', '45'];

// Πλήρης & λεπτομερής μετάφραση όλων των πιθανών σφαλμάτων διαθεσιμότητας
const translateAvailabilityError = (errObj: any): string => {
  // Συγκέντρωση όλων των πιθανών πεδίων όπου το backend στέλνει το κείμενο ή κωδικό σφάλματος
  const rawMessage = 
    errObj?.reason || 
    errObj?.message || 
    errObj?.detail || 
    errObj?.error || 
    errObj?.response?.data?.message || 
    errObj?.response?.data?.detail || 
    (typeof errObj === 'string' ? errObj : '');

  const text = String(rawMessage).toLowerCase();
  const code = String(errObj?.code || errObj?.response?.data?.code || '').toLowerCase();

  // 1. Ειδικές Εξαιρέσεις / Κλειστό Ιατρείο (Closures / Exceptions)
  if (text.includes('closure') || text.includes('exception') || code.includes('closure') || errObj?.closure) {
    const closureData = errObj?.closure || errObj?.details?.closure;
    if (closureData?.starts_at && closureData?.ends_at) {
      try {
        const start = new Date(closureData.starts_at).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
        const end = new Date(closureData.ends_at).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
        return start === end 
          ? `Το ιατρείο είναι κλειστό στις ${start} (Αργία / Ειδική Εξαίρεση).`
          : `Το ιατρείο είναι κλειστό από ${start} έως ${end}.`;
      } catch {}
    }
    return 'Το ιατρείο είναι κλειστό την επιλεγμένη ημερομηνία (Αργία / Εξαίρεση).';
  }

  // 2. Εκτός Ωραρίου Λειτουργίας / Διάρκεια που υπερβαίνει το ωράριο
  if (
    text.includes('fit within') || 
    text.includes('operating hours') || 
    text.includes('working hours') || 
    text.includes('outside') || 
    text.includes('closed') || 
    code.includes('outside_working_hours')
  ) {
    return 'Η ώρα ή η διάρκεια του ραντεβού είναι εκτός του εγκεκριμένου ωραρίου λειτουργίας του ιατρείου.';
  }

  // 3. Επικάλυψη / Διπλοκράτηση (Conflict / Overlap)
  if (
    text.includes('conflict') || 
    text.includes('overlap') || 
    text.includes('already booked') || 
    text.includes('taken') || 
    text.includes('busy') ||
    text.includes('exists') ||
    code.includes('slot_taken')
  ) {
    return 'Υπάρχει ήδη προγραμματισμένο ραντεβού την ίδια ώρα. Παρακαλώ επιλέξτε άλλη ώρα.';
  }

  // 4. Ελάχιστος χρόνος προειδοποίησης / Παρελθόν
  if (text.includes('notice') || text.includes('past') || code.includes('notice')) {
    return 'Δεν είναι δυνατή η κράτηση σε αυτή την ώρα λόγω ελάχιστου χρόνου προειδοποίησης ή επειδή η ώρα έχει παρέλθει.';
  }

  // 5. Αν το backend έστειλε γενικό API error
  if (text.includes('api error') || text.includes('bad request') || text.includes('400')) {
    return 'Η επιλεγμένη ώρα δεν είναι διαθέσιμη (π.χ. υπάρχει επικάλυψη ή το ιατρείο είναι κλειστό).';
  }

  // 6. Επιστροφή του αρχικού μηνύματος αν υπάρχει, αλλιώς γενικό ελληνικό fallback
  return rawMessage && typeof rawMessage === 'string' && rawMessage.length < 120 
    ? rawMessage 
    : 'Δεν ήταν δυνατή η ολοκλήρωση της κράτησης στην επιλεγμένη ώρα.';
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
  
  // Διαχωρισμός ώρας και λεπτών για φιλική επιλογή
  const [selectedHour, setSelectedHour] = useState(() => initialTime ? initialTime.split(':')[0] : '09');
  const [selectedMinute, setSelectedMinute] = useState(() => initialTime ? initialTime.split(':')[1] : '00');

  const [durationMinutes, setDurationMinutes] = useState(30);

  const [appointmentTypesList, setAppointmentTypesList] = useState<
    Array<{ code: string; name: string; duration_minutes: number }>
  >(DEFAULT_APPOINTMENT_TYPES);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ starts_at: string; ends_at: string }>>([]);

  const currentTimeString = `${selectedHour}:${selectedMinute}`;

  // Υπολογισμός ώρας λήξης
  const calculateEndTime = () => {
    if (!selectedHour || !selectedMinute) return '';
    const start = new Date();
    start.setHours(parseInt(selectedHour, 10), parseInt(selectedMinute, 10), 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const endH = String(end.getHours()).padStart(2, '0');
    const endM = String(end.getMinutes()).padStart(2, '0');
    return `${endH}:${endM}`;
  };

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

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    setAppointmentType(selectedCode);

    const foundType = appointmentTypesList.find((t) => t.code === selectedCode);
    if (foundType) {
      setDurationMinutes(foundType.duration_minutes);
    }
  };

  const setTimeFromQuickSlot = (slot: string) => {
    const [h, m] = slot.split(':');
    setSelectedHour(h);
    setSelectedMinute(m);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvailabilityError(null);
    setSuggestions([]);

    if (!date || !selectedHour || !selectedMinute) return;

    try {
      setIsSubmitting(true);
      const startsAtISO = new Date(`${date}T${currentTimeString}:00`).toISOString();

      // 1. Έλεγχος Διαθεσιμότητας
      try {
        const checkRes = await api.checkAvailability(
          { starts_at: startsAtISO, duration_minutes: durationMinutes },
          selectedClinic?.id
        );

        if (checkRes && checkRes.available === false) {
          const translatedMsg = translateAvailabilityError(checkRes);
          setAvailabilityError(translatedMsg);
          
          if (Array.isArray(checkRes.suggestions)) {
            setSuggestions(checkRes.suggestions);
          }
          setIsSubmitting(false);
          return;
        }
      } catch (checkErr: any) {
        console.warn('Availability check failed:', checkErr);
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
      const translatedMsg = translateAvailabilityError(err);
      setAvailabilityError(translatedMsg);
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
    setSelectedHour(hours);
    setSelectedMinute(minutes);
    setAvailabilityError(null);
    setSuggestions([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Νέο Ραντεβού</span>
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1"
          >
            ✕
          </button>
        </div>

        {availabilityError && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs rounded-xl space-y-2">
            <p className="font-bold flex items-start gap-1.5">
              <span className="shrink-0">⚠️</span> 
              <span>{availabilityError}</span>
            </p>
            {suggestions.length > 0 && (
              <div className="pt-1">
                <p className="font-semibold text-amber-900 dark:text-amber-300 mb-1.5">Προτεινόμενες εναλλακτικές ώρες:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, i) => {
                    const d = new Date(sug.starts_at);
                    const timeLabel = d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug.starts_at)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-lg text-[11px] font-bold transition-colors shadow-2xs"
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
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Τηλέφωνο Επικοινωνίας</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Τύπος Ραντεβού</label>
              <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">Διάρκεια: {durationMinutes} λεπτά</span>
            </div>
            <select
              value={appointmentType}
              onChange={handleTypeChange}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold outline-none focus:border-blue-500"
            >
              {appointmentTypesList.map((type) => (
                <option key={type.code} value={type.code} className="dark:bg-slate-800 dark:text-slate-100">
                  {type.name} ({type.duration_minutes} λ.)
                </option>
              ))}
            </select>
          </div>

          {/* Ημερομηνία & Ώρα Section */}
          <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ημερομηνία Ραντεβού</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium outline-none focus:border-blue-500"
              />
            </div>

            {/* ΕΠΙΛΟΓΗ ΩΡΑΣ UI */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Ώρα Έναρξης</label>
                <span className="text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                  {currentTimeString} - {calculateEndTime()} ({durationMinutes}λ)
                </span>
              </div>

              {/* Dropdowns Ώρας & Λεπτών */}
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">Ώρα</span>
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-center outline-none focus:border-blue-500"
                  >
                    {HOURS_OPTIONS.map((h) => (
                      <option key={h} value={h}>{h}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">Λεπτά</span>
                  <select
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-center outline-none focus:border-blue-500"
                  >
                    {MINUTES_OPTIONS.map((m) => (
                      <option key={m} value={m}>:{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Γρήγορα Quick-Select Chips */}
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1 font-medium">Γρήγορη Επιλογή:</span>
                <div className="flex flex-wrap gap-1">
                  {QUICK_TIME_SLOTS.map((slot) => {
                    const isSelected = currentTimeString === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setTimeFromQuickSlot(slot)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs scale-105'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}