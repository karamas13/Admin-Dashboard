'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CreateAppointmentModalProps {
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface AppointmentType {
  code: string;
  name: string;
  duration_minutes: number;
}

const DEFAULT_APPOINTMENT_TYPES: AppointmentType[] = [
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

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_KEYS_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const translateAvailabilityError = (errObj: any): string => {
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

  if (text.includes('notice') || text.includes('past') || code.includes('notice')) {
    return 'Δεν είναι δυνατή η κράτηση σε αυτή την ώρα λόγω ελάχιστου χρόνου προειδοποίησης ή επειδή η ώρα έχει παρέλθει.';
  }

  if (text.includes('api error') || text.includes('bad request') || text.includes('400')) {
    return 'Η επιλεγμένη ώρα δεν είναι διαθέσιμη (π.χ. υπάρχει επικάλυψη ή το ιατρείο είναι κλειστό).';
  }

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
  const [selectedTime, setSelectedTime] = useState(initialTime || '09:00');

  const [durationMinutes, setDurationMinutes] = useState(30);
  const [appointmentTypesList, setAppointmentTypesList] = useState<AppointmentType[]>(DEFAULT_APPOINTMENT_TYPES);
  const [settingsData, setSettingsData] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ starts_at: string; ends_at: string }>>([]);

  // Fetch Clinic Settings
  useEffect(() => {
    async function fetchClinicSettings() {
      if (!selectedClinic?.id) return;
      try {
        const res = await api.getSettings(selectedClinic.id);
        const data = res?.settings || res;

        if (data) {
          setSettingsData(data);

          let parsedTypes: AppointmentType[] = [];
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
            const currentExists = parsedTypes.find((t) => t.code === appointmentType);
            if (!currentExists) {
              setAppointmentType(parsedTypes[0].code);
              setDurationMinutes(parsedTypes[0].duration_minutes);
            } else {
              setDurationMinutes(currentExists.duration_minutes);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load clinic settings:', err);
      }
    }

    fetchClinicSettings();
  }, [selectedClinic?.id]);

  // Compute exact time slots based on settings for selected date
  const { availableTimeSlots, isClosedDay } = useMemo(() => {
    if (!date) return { availableTimeSlots: [], isClosedDay: false };

    const selectedDayObj = new Date(date + 'T00:00:00');
    const dayIndex = selectedDayObj.getDay();
    const dayName = DAY_KEYS[dayIndex];
    const dayShort = DAY_KEYS_SHORT[dayIndex];

    let startHour = 8;
    let startMin = 0;
    let endHour = 21;
    let endMin = 0;
    let stepMinutes = 15;
    let isClosed = false;

    if (settingsData) {
      const scheduleConfig =
        settingsData.operating_hours ||
        settingsData.working_hours ||
        settingsData.operating_hours_json ||
        settingsData.working_hours_json ||
        settingsData.schedule;

      if (scheduleConfig) {
        const daySchedule = scheduleConfig[dayName] || scheduleConfig[dayShort] || scheduleConfig[dayIndex];
        if (daySchedule) {
          if (daySchedule.closed === true || daySchedule.is_closed === true || daySchedule.active === false) {
            isClosed = true;
          }
          const rawStart = daySchedule.start || daySchedule.starts_at || daySchedule.open || daySchedule.from;
          const rawEnd = daySchedule.end || daySchedule.ends_at || daySchedule.close || daySchedule.to;

          if (rawStart) {
            const [h, m] = String(rawStart).split(':').map(Number);
            if (!isNaN(h)) startHour = h;
            if (!isNaN(m)) startMin = m;
          }
          if (rawEnd) {
            const [h, m] = String(rawEnd).split(':').map(Number);
            if (!isNaN(h)) endHour = h;
            if (!isNaN(m)) endMin = m;
          }
        }
      }

      if (settingsData.slot_step_minutes || settingsData.slot_interval) {
        const step = Number(settingsData.slot_step_minutes || settingsData.slot_interval);
        if (step > 0 && step <= 60) stepMinutes = step;
      }
    }

    if (isClosed) return { availableTimeSlots: [], isClosedDay: true };

    const slots: string[] = [];
    const current = new Date();
    current.setHours(startHour, startMin, 0, 0);

    const end = new Date();
    end.setHours(endHour, endMin, 0, 0);

    while (current < end) {
      const hh = String(current.getHours()).padStart(2, '0');
      const mm = String(current.getMinutes()).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
      current.setTime(current.getTime() + stepMinutes * 60000);
    }

    return { availableTimeSlots: slots, isClosedDay: false };
  }, [settingsData, date]);

  // Sync selected time with available slots
  useEffect(() => {
    if (availableTimeSlots.length > 0 && !availableTimeSlots.includes(selectedTime)) {
      setSelectedTime(availableTimeSlots[0]);
    }
  }, [availableTimeSlots, selectedTime]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    setAppointmentType(selectedCode);
    const found = appointmentTypesList.find((t) => t.code === selectedCode);
    if (found) setDurationMinutes(found.duration_minutes);
  };

  const calculateEndTime = () => {
    if (!selectedTime) return '';
    const [h, m] = selectedTime.split(':').map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvailabilityError(null);
    setSuggestions([]);

    if (!date || !selectedTime) return;

    try {
      setIsSubmitting(true);
      const startsAtISO = new Date(`${date}T${selectedTime}:00`).toISOString();

      try {
        const checkRes = await api.checkAvailability(
          { starts_at: startsAtISO, duration_minutes: durationMinutes },
          selectedClinic?.id
        );

        if (checkRes && checkRes.available === false) {
          setAvailabilityError(translateAvailabilityError(checkRes));
          if (Array.isArray(checkRes.suggestions)) setSuggestions(checkRes.suggestions);
          setIsSubmitting(false);
          return;
        }
      } catch (checkErr: any) {
        console.warn('Availability check warning:', checkErr);
      }

      await api.createAppointment(
        {
          clinic_id: selectedClinic?.id,
          caller_name: callerName,
          phone: phone,
          appointment_type_code: appointmentType,
          start_at: startsAtISO,
          duration_minutes: durationMinutes,
          status: 'booked',
        },
        selectedClinic?.id
      );

      onSuccess();
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      setAvailabilityError(translateAvailabilityError(err));
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
    setSelectedTime(`${hours}:${minutes}`);
    setAvailabilityError(null);
    setSuggestions([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-blue-500 shrink-0" />
            <span>Νέο Ραντεβού</span>
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Availability Error Banner */}
        {availabilityError && (
          <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs rounded-xl space-y-2">
            <p className="font-bold flex items-start gap-1.5">
              <span className="shrink-0">⚠️️</span> 
              <span>{availabilityError}</span>
            </p>
            {suggestions.length > 0 && (
              <div className="pt-1 border-t border-amber-800/40">
                <p className="font-semibold text-amber-300 mb-1.5">Προτεινόμενες εναλλακτικές ώρες:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, i) => {
                    const d = new Date(sug.starts_at);
                    const timeLabel = d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug.starts_at)}
                        className="px-2.5 py-1 bg-slate-900 border border-amber-700 hover:bg-amber-900/60 text-amber-200 rounded-lg text-[11px] font-bold transition-colors"
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

        {/* Form Grid */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Row 1: Patient Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Ονοματεπώνυμο Πελάτη</label>
              <input
                type="text"
                required
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                className="w-full p-2.5 border border-slate-700 rounded-xl bg-slate-800/80 text-slate-100 font-medium outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Τηλέφωνο Επικοινωνίας</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border border-slate-700 rounded-xl bg-slate-800/80 text-slate-100 font-medium outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Appointment Type & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-300">Τύπος Ραντεβού</label>
                <span className="text-slate-400 text-[11px]">Διάρκεια: {durationMinutes}λ</span>
              </div>
              <select
                value={appointmentType}
                onChange={handleTypeChange}
                className="w-full p-2.5 border border-slate-700 rounded-xl bg-slate-800/80 text-slate-100 font-semibold outline-none focus:border-blue-500 transition-colors"
              >
                {appointmentTypesList.map((type) => (
                  <option key={type.code} value={type.code} className="bg-slate-800 text-slate-100">
                    {type.name} ({type.duration_minutes} λ.)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Ημερομηνία Ραντεβού</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 border border-slate-700 rounded-xl bg-slate-800/80 text-slate-100 font-medium outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Row 3: Time Slot Selection (Settings Linked) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-300">Ώρα Έναρξης</label>
              {selectedTime && !isClosedDay && (
                <span className="text-blue-400 font-bold text-[11px]">
                  {selectedTime} - {calculateEndTime()} ({durationMinutes}λ)
                </span>
              )}
            </div>

            {isClosedDay ? (
              <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs rounded-xl">
                Το ιατρείο είναι κλειστό την επιλεγμένη ημερομηνία.
              </div>
            ) : (
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full p-2.5 border border-slate-700 rounded-xl bg-slate-800/80 text-slate-100 font-semibold outline-none focus:border-blue-500 transition-colors"
              >
                {availableTimeSlots.map((slot) => (
                  <option key={slot} value={slot} className="bg-slate-800 text-slate-100">
                    {slot}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Buttons Footer */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold transition-colors"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isClosedDay}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}