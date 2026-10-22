'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api, getStoredClinicId } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';
import { ClockIcon, XMarkIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

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
    return 'Το ιατρείο είναι κλειστό την επιλεγμένη ημερομηνία (Αργία / Ειδική Εξαίρεση).';
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
    return 'Υπάρχει ήδη προγραμματισμένο ραντεβού την ίδια ώρα. Δείτε παρακάτω το αμέσως επόμενο διαθέσιμο slot.';
  }

  return 'Η επιλεγμένη ώρα δεν είναι διαθέσιμη (υπάρχει επικάλυψη ή το ιατρείο είναι κλειστό).';
};

export default function CreateAppointmentModal({
  initialDate = '',
  initialTime = '09:00',
  onClose,
  onSuccess,
}: CreateAppointmentModalProps) {
  const { selectedClinic } = useClinic();
  const activeClinicId = selectedClinic?.id || getStoredClinicId();

  const [callerName, setCallerName] = useState('');
  const [phone, setPhone] = useState('');
  const [appointmentType, setAppointmentType] = useState('checkup');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(initialTime || '09:00');

  const [isManualDuration, setIsManualDuration] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(30);

  const [appointmentTypesList, setAppointmentTypesList] = useState<AppointmentType[]>(DEFAULT_APPOINTMENT_TYPES);
  const [settingsData, setSettingsData] = useState<any>(null);
  const [bookedIntervals, setBookedIntervals] = useState<Array<{ start: number; end: number }>>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [nextBestSlot, setNextBestSlot] = useState<{ starts_at: string; ends_at: string } | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!activeClinicId || !date) return;
      try {
        const res = await api.getSettings(activeClinicId);
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
                const parsedTitle = GREEK_LABEL_MAP[key] || key.replace(/_/g, ' ');
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
            if (!currentExists && !isManualDuration) {
              setAppointmentType(parsedTypes[0].code);
              setDurationMinutes(parsedTypes[0].duration_minutes);
            }
          }
        }

        const startOfDay = `${date}T00:00:00Z`;
        const endOfDay = `${date}T23:59:59Z`;
        const apptsRes = await api.getAppointments({ startAt: startOfDay, endAt: endOfDay, clinicId: activeClinicId });
        const apptsList = Array.isArray(apptsRes) ? apptsRes : apptsRes?.appointments || [];

        const intervals = apptsList
          .filter((app: any) => app.status !== 'cancelled' && app.status !== 'failed')
          .map((app: any) => {
            const startMs = new Date(app.start_at || app.starts_at).getTime();
            const dur = Number(app.duration_minutes || 30);
            return {
              start: startMs,
              end: startMs + dur * 60000,
            };
          });
        setBookedIntervals(intervals);

      } catch (err) {
        console.error('Failed to load clinic settings or appointments:', err);
      }
    }

    fetchData();
  }, [activeClinicId, date]);

  // Υπολογισμός διαθέσιμων slots υποστηρίζοντας πολλαπλά διαστήματα (Σπαστό Ωράριο)
  const { availableTimeSlots, isClosedDay } = useMemo(() => {
    if (!date) return { availableTimeSlots: [], isClosedDay: false };

    const selectedDayObj = new Date(date + 'T00:00:00');
    const dayIndex = selectedDayObj.getDay();
    const dayKey = String(dayIndex === 0 ? 7 : dayIndex);
    const dayName = DAY_KEYS[dayIndex];
    const dayShort = DAY_KEYS_SHORT[dayIndex];

    let intervalsList: Array<{ start: string; end: string }> = [];
    let isClosed = false;

    if (settingsData) {
      const scheduleConfig =
        settingsData.working_hours_json ||
        settingsData.operating_hours_json ||
        settingsData.working_hours ||
        settingsData.operating_hours ||
        settingsData.schedule;

      if (scheduleConfig) {
        const daySchedule = scheduleConfig[dayKey] || scheduleConfig[String(dayIndex)] || scheduleConfig[dayName] || scheduleConfig[dayShort];
        
        if (daySchedule) {
          if (Array.isArray(daySchedule)) {
            intervalsList = daySchedule;
          } else {
            if (daySchedule.closed === true || daySchedule.is_closed === true || daySchedule.active === false) {
              isClosed = true;
            }
            if (Array.isArray(daySchedule.slots)) {
              intervalsList = daySchedule.slots;
            } else if (daySchedule.start && daySchedule.end) {
              intervalsList = [{ start: daySchedule.start, end: daySchedule.end }];
            }
          }
        }
      }
    }

    if (isClosed || intervalsList.length === 0) return { availableTimeSlots: [], isClosedDay: isClosed || intervalsList.length === 0 };

    let stepMinutes = 30;
    if (settingsData?.slot_step_minutes || settingsData?.slot_interval) {
      const step = Number(settingsData.slot_step_minutes || settingsData.slot_interval);
      if (step > 0 && step <= 60) stepMinutes = step;
    }

    const rawSlots: string[] = [];

    intervalsList.forEach((interval) => {
      if (!interval.start || !interval.end) return;
      const [sh, sm] = interval.start.split(':').map(Number);
      const [eh, em] = interval.end.split(':').map(Number);

      let currentMin = sh * 60 + sm;
      const endMinLimit = eh * 60 + em;

      while (currentMin + durationMinutes <= endMinLimit) {
        const hh = String(Math.floor(currentMin / 60)).padStart(2, '0');
        const mm = String(currentMin % 60).padStart(2, '0');
        rawSlots.push(`${hh}:${mm}`);
        currentMin += stepMinutes;
      }
    });

    const freeSlots = rawSlots.filter((slotStr) => {
      const [h, m] = slotStr.split(':').map(Number);
      const slotStartMs = new Date(date + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00').getTime();
      const slotEndMs = slotStartMs + durationMinutes * 60000;

      const hasConflict = bookedIntervals.some((booked) => {
        return slotStartMs < booked.end && slotEndMs > booked.start;
      });

      return !hasConflict;
    });

    return { availableTimeSlots: freeSlots, isClosedDay: false };
  }, [settingsData, date, bookedIntervals, durationMinutes]);

  useEffect(() => {
    if (availableTimeSlots.length > 0 && !availableTimeSlots.includes(selectedTime)) {
      setSelectedTime(availableTimeSlots[0]);
    }
  }, [availableTimeSlots]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    setAppointmentType(selectedCode);
    if (!isManualDuration) {
      const found = appointmentTypesList.find((t) => t.code === selectedCode);
      if (found) setDurationMinutes(found.duration_minutes);
    }
  };

  const calculateEndTime = () => {
    if (!selectedTime) return '';
    const [h, m] = selectedTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '';
    const start = new Date();
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  };

  const parseValidDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d;
    const parsed = Date.parse(dateVal);
    if (!isNaN(parsed)) return new Date(parsed);
    return null;
  };

  const computeFrontendSuggestion = (currentSelectedTime: string) => {
    if (!availableTimeSlots || availableTimeSlots.length === 0) return;

    const currentIndex = availableTimeSlots.indexOf(currentSelectedTime);
    const nextSlotTime = currentIndex !== -1 && currentIndex < availableTimeSlots.length - 1 
      ? availableTimeSlots[currentIndex + 1] 
      : availableTimeSlots[0];

    if (!nextSlotTime) return;

    const startsAtDate = new Date(`${date}T${nextSlotTime}:00`);
    const endsAtDate = new Date(startsAtDate.getTime() + durationMinutes * 60000);

    setNextBestSlot({
      starts_at: startsAtDate.toISOString(),
      ends_at: endsAtDate.toISOString(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvailabilityError(null);
    setNextBestSlot(null);

    if (!date || !selectedTime) return;

    if (!activeClinicId) {
      setAvailabilityError('Παρακαλώ επιλέξτε κλινική πριν προχωρήσετε σε κράτηση ραντεβού.');
      return;
    }

    try {
      setIsSubmitting(true);
      const startsAtISO = new Date(`${date}T${selectedTime}:00`).toISOString();

      try {
        const checkRes = await api.checkAvailability(
          startsAtISO,
          durationMinutes,
          activeClinicId
        );

        if (checkRes && checkRes.available === false) {
          setAvailabilityError(translateAvailabilityError(checkRes));
          
          if (Array.isArray(checkRes.suggestions) && checkRes.suggestions.length > 0) {
            setNextBestSlot(checkRes.suggestions[0]);
          } else {
            computeFrontendSuggestion(selectedTime);
          }

          setIsSubmitting(false);
          return;
        }
      } catch (checkErr: any) {
        console.warn('Availability check warning:', checkErr);
      }

      await api.createAppointment(
        {
          caller_name: callerName,
          phone: phone,
          appointment_type_code: appointmentType,
          start_at: startsAtISO,
          duration_minutes: durationMinutes,
        },
        activeClinicId
      );

      onSuccess();
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      setAvailabilityError(translateAvailabilityError(err));
      computeFrontendSuggestion(selectedTime);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyNextBestSlot = () => {
    if (!nextBestSlot) return;
    const sugDate = parseValidDate(nextBestSlot.starts_at);
    if (!sugDate) return;

    const dateStr = sugDate.toISOString().split('T')[0];
    const hours = String(sugDate.getHours()).padStart(2, '0');
    const minutes = String(sugDate.getMinutes()).padStart(2, '0');

    setDate(dateStr);
    setSelectedTime(`${hours}:${minutes}`);
    setAvailabilityError(null);
    setNextBestSlot(null);
  };

  const parsedBestSlotDate = nextBestSlot ? parseValidDate(nextBestSlot.starts_at) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-blue-500 shrink-0" />
            <span>Νέο Ραντεβού</span>
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {availabilityError && (
          <div className="p-4 bg-amber-950/50 border border-amber-800/80 text-amber-200 text-xs rounded-2xl space-y-3 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold text-sm shrink-0">⚠️</span>
              <p className="font-semibold leading-relaxed">{availabilityError}</p>
            </div>

            {nextBestSlot && parsedBestSlotDate && (
              <div className="pt-2 border-t border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-900/30 p-3 rounded-xl border border-amber-700/50">
                <div>
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                    Προτεινόμενο Slot
                  </span>
                  <p className="text-white font-mono font-bold text-sm">
                    {parsedBestSlotDate.toLocaleString('el-GR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleApplyNextBestSlot}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer whitespace-nowrap"
                >
                  Χρήση αυτής της ώρας
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Ονοματεπώνυμο Πελάτη</label>
              <input
                type="text"
                required
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                placeholder="π.χ. Μαρία Παπαδοπούλου"
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
                placeholder="π.χ. +306900000000"
                className="w-full p-2.5 border border-slate-700 rounded-xl bg-slate-800/80 text-slate-100 font-medium outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-300">Τύπος Ραντεβού</label>
                <button
                  type="button"
                  onClick={() => setIsManualDuration(!isManualDuration)}
                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <PencilSquareIcon className="w-3.5 h-3.5" />
                  <span>{isManualDuration ? 'Προκαθορισμένος τύπος' : 'Χειροκίνητη διάρκεια'}</span>
                </button>
              </div>

              {isManualDuration ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={durationMinutes}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setDurationMinutes(val === '' ? 0 : Number(val));
                    }}
                    placeholder="π.χ. 45"
                    className="w-full p-2.5 border border-slate-700 rounded-xl bg-slate-800/80 text-slate-100 font-semibold outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="text-slate-400 whitespace-nowrap">λεπτά</span>
                </div>
              ) : (
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
              )}
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

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-300">Ώρα Έναρξης</label>
              {selectedTime && !isClosedDay && (
                <span className="text-blue-400 font-bold text-[11px]">
                  {selectedTime} - {calculateEndTime()} ({durationMinutes} λεπτά)
                </span>
              )}
            </div>

            {isClosedDay ? (
              <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs rounded-xl">
                Το ιατρείο είναι κλειστό την επιλεγμένη ημερομηνία.
              </div>
            ) : availableTimeSlots.length === 0 ? (
              <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs rounded-xl">
                Δεν υπάρχουν διαθέσιμα slots εντός ωραρίου για την επιλεγμένη διάρκεια.
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

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              Ακύρωση
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isClosedDay || availableTimeSlots.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Αποθήκευση...' : 'Αποθήκευση'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}