'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FiCalendar, 
  FiClock, 
  FiXCircle, 
  FiRefreshCw, 
  FiPlus, 
  FiChevronLeft, 
  FiChevronRight,
  FiUser,
  FiPhone,
  FiSlash
} from 'react-icons/fi';
import AppointmentDetailsPanel from '@/components/appointment-details';
import CreateAppointmentModal from '@/components/create-appointment-modal';
import { Appointment, AppointmentStatus } from '@/types';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';

const DEFAULT_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', 
  '17:00', '17:30', '18:00'
];

const GREEK_LABEL_MAP: Record<string, string> = {
  checkup: 'Εξέταση / Έλεγχος',
  cleaning: 'Καθαρισμός',
  filling: 'Σφράγισμα',
  emergency: 'Έκτακτο',
  pain: 'Οξύς Πόνος',
  whitening: 'Λεύκανση',
  other: 'Άλλο',
  unknown: 'Γενικό Ραντεβού',
};

// Semantic status styling based on UI design systems
const STATUS_CONFIG: Record<AppointmentStatus, { label: string; badge: string; indicator: string }> = {
  booked: {
    label: 'Επιβεβαιώμενο',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    indicator: 'bg-emerald-500',
  },
  pending: {
    label: 'Σε αναμονή',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    indicator: 'bg-amber-500',
  },
  rescheduled: {
    label: 'Επαναπρογραμματισμένο',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    indicator: 'bg-blue-500',
  },
  expired: {
    label: 'Έληξε',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    indicator: 'bg-slate-400',
  },
  failed: {
    label: 'Απέτυχε',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    indicator: 'bg-rose-500',
  },
  cancelled: {
    label: 'Ακυρώθηκε',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    indicator: 'bg-rose-500',
  },
};

export default function AppointmentsPage() {
  const { selectedClinic } = useClinic();
  const { settings, fetchSettings, fetchAppointments: fetchContextAppointments, appointments: contextAppointments } = useDashboard(); 

  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  const [dynamicTimeSlots, setDynamicTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);

  const actualSettings = settings?.settings || settings || {};
  const workingHours = (actualSettings.working_hours_json && typeof actualSettings.working_hours_json === 'object') ? actualSettings.working_hours_json : {};
  const slotInterval = Number(actualSettings.slot_interval_minutes) || 30;
  const prepsData = actualSettings.appointment_preparation_json || {};

  useEffect(() => {
    if (selectedClinic?.id) {
      fetchSettings();
      fetchContextAppointments();
    }
  }, [selectedClinic?.id, fetchSettings, fetchContextAppointments]);

  useEffect(() => {
    if (contextAppointments) {
      setAppointments(contextAppointments);
    }
  }, [contextAppointments]);

  const formatDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
  };

  useEffect(() => {
    const activeDays = Object.values(workingHours).flat();
    if (activeDays.length === 0) {
      setDynamicTimeSlots(DEFAULT_TIME_SLOTS);
      return;
    }

    let minStartMinutes = 24 * 60;
    let maxEndMinutes = 0;

    activeDays.forEach((slot: any) => {
      if (!slot.start || !slot.end) return;
      const [sh, sm] = slot.start.split(':').map(Number);
      const [eh, em] = slot.end.split(':').map(Number);

      const startTotal = sh * 60 + sm;
      const endTotal = eh * 60 + em;

      if (startTotal < minStartMinutes) minStartMinutes = startTotal;
      if (endTotal > maxEndMinutes) maxEndMinutes = endTotal;
    });

    if (minStartMinutes >= maxEndMinutes) {
      setDynamicTimeSlots(DEFAULT_TIME_SLOTS);
      return;
    }

    const interval = slotInterval > 0 ? slotInterval : 30;
    const generatedSlots: string[] = [];

    for (let time = minStartMinutes; time < maxEndMinutes; time += interval) {
      const h = Math.floor(time / 60);
      const m = time % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      generatedSlots.push(timeStr);
    }

    setDynamicTimeSlots(generatedSlots.length > 0 ? generatedSlots : DEFAULT_TIME_SLOTS);
  }, [workingHours, slotInterval]);

  const isTimeWithinWorkingHours = (targetDate: Date, timeStr: string): boolean => {
    const dayNum = targetDate.getDay(); 
    const dayKey = String(dayNum); 

    const daySlots: any = workingHours[dayKey];
    if (!daySlots || daySlots.length === 0) return false;

    const [h, m] = timeStr.split(':').map(Number);
    const timeVal = h * 60 + m;

    return daySlots.some((slot: any) => {
      const [sh, sm] = slot.start.split(':').map(Number);
      const [eh, em] = slot.end.split(':').map(Number);
      const startVal = sh * 60 + sm;
      const endVal = eh * 60 + em;

      return timeVal >= startVal && timeVal < endVal;
    });
  };

  const isSlotMatching = (apptStartAt: string, targetIsoDateStr: string, slotTime: string) => {
    if (!apptStartAt) return false;
    
    const apptDate = new Date(apptStartAt);
    const apptDayStr = formatDateString(apptDate);
    if (apptDayStr !== targetIsoDateStr) return false;

    const hours = String(apptDate.getHours()).padStart(2, '0');
    const minutes = String(apptDate.getMinutes()).padStart(2, '0');
    const apptTime = `${hours}:${minutes}`;

    return apptTime === slotTime;
  };

  const getAppointmentTypeLabel = (typeCode?: string) => {
    if (!typeCode) return 'Γενικό Ραντεβού';
    const rawPrep = prepsData[typeCode] || '';

    if (rawPrep.startsWith('[TITLE:')) {
      const match = rawPrep.match(/^\[TITLE:\s*(.*?)\]/);
      if (match && match[1]) return match[1];
    }

    return GREEK_LABEL_MAP[typeCode] || typeCode.replace(/_/g, ' ');
  };

  const getPatientName = (appt: any) => {
    if (!appt) return 'Ανώνυμος Ασθενής';
    return (
      appt.caller_name ||
      appt.patient_name ||
      appt.patient?.full_name ||
      appt.patient?.name ||
      appt.caller?.name ||
      appt.name ||
      'Ανώνυμος Ασθενής'
    );
  };

  const getPatientPhone = (appt: any) => {
    if (!appt) return '-';
    return (
      appt.phone_normalized ||
      appt.callback_phone ||
      appt.phone_number ||
      appt.patient?.phone ||
      appt.caller?.phone ||
      '-'
    );
  };

  const getDaysOfWeek = useCallback((anchorDate: Date) => {
    const currentDay = anchorDate.getDay();
    const dayIndex = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date(anchorDate);
    monday.setDate(anchorDate.getDate() - dayIndex);

    const daysName = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];
    
    return daysName.map((name, index) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + index);
      return {
        name,
        dateObject: d,
        formattedDate: d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' }),
        isoString: formatDateString(d)
      };
    });
  }, []);

  const daysOfWeek = getDaysOfWeek(currentDate);

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setDate(currentDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + 1);
    } else {
      newDate.setDate(currentDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenCreate = (dateStr?: string, timeStr?: string) => {
    const targetDate = dateStr || formatDateString(currentDate);
    const targetTime = timeStr || '09:00';
    
    setSelectedSlot({ date: targetDate, time: targetTime });
    setIsCreateOpen(true);
  };

  const activeAppointments = useMemo(
    () => appointments.filter(a => a.status !== 'cancelled'),
    [appointments]
  );

  const currentDateIso = formatDateString(currentDate);

  const stats = useMemo(() => {
    const activeToday = activeAppointments.filter(a => a.start_at && a.start_at.includes(currentDateIso)).length;
    const workingSlotCount = dynamicTimeSlots.filter(t => isTimeWithinWorkingHours(currentDate, t)).length;
    const openSlots = Math.max(0, workingSlotCount - activeToday);
    const cancelledToday = appointments.filter(a => a.start_at && a.start_at.includes(currentDateIso) && a.status === 'cancelled').length;
    const rescheduledTotal = appointments.filter(a => a.status === 'rescheduled').length;

    return { activeToday, openSlots, cancelledToday, rescheduledTotal };
  }, [activeAppointments, appointments, currentDate, currentDateIso, dynamicTimeSlots, workingHours]);

  return (
    <div className="space-y-5 max-w-full overflow-hidden text-slate-900 dark:text-slate-100">
      {/* Integrated Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Left Controls: View Switcher & Date Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
              <button 
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'day' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Ημέρα
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'week' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Εβδομάδα
              </button>
            </div>

            {/* Date Stepper */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
              <button 
                onClick={handlePrev}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-r border-slate-200 dark:border-slate-700 transition-colors"
                title="Προηγούμενο"
                aria-label="Προηγούμενη περίοδος"
              >
                <FiChevronLeft className="text-base" />
              </button>
              <button 
                onClick={handleToday}
                className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-r border-slate-200 dark:border-slate-700"
              >
                Σήμερα
              </button>
              <button 
                onClick={handleNext}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Επόμενο"
                aria-label="Επόμενη περίοδος"
              >
                <FiChevronRight className="text-base" />
              </button>
            </div>

            {/* Current Range Label */}
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 px-1">
              <FiCalendar className="text-slate-400 dark:text-slate-500" />
              <span className="capitalize">
                {viewMode === 'day' 
                  ? currentDate.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : `${daysOfWeek[0].formattedDate} — ${daysOfWeek[6].formattedDate}`
                }
              </span>
            </div>
          </div>

          {/* Right Action: Create New Appointment */}
          <div className="flex items-center justify-end gap-3">
            <button 
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg shadow-xs transition-colors"
            >
              <FiPlus className="text-sm" />
              <span>Νέο Ραντεβού</span>
            </button>
          </div>
        </div>

        {/* Clean Operational Summary Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <FiCalendar className="text-base" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ενεργά Ραντεβού</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{stats.activeToday}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <FiClock className="text-base" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Διαθέσιμα Slots</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{stats.openSlots}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <FiXCircle className="text-base" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ακυρώσεις Ημέρας</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{stats.cancelledToday}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="p-2 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <FiRefreshCw className="text-base" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Επαναπρογραμματισμένα</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{stats.rescheduledTotal}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Schedule Container */}
      {viewMode === 'day' ? (
        /* Day View Layout */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dynamicTimeSlots.map((time) => {
              const targetDayStr = formatDateString(currentDate);
              const isOpenSlot = isTimeWithinWorkingHours(currentDate, time);
              const appt = activeAppointments.find(a => isSlotMatching(a.start_at, targetDayStr, time));
              const statusCfg = appt ? (STATUS_CONFIG[appt.status] || STATUS_CONFIG.booked) : null;

              return (
                <div 
                  key={time} 
                  className={`flex transition-colors ${
                    !isOpenSlot && !appt 
                      ? 'bg-slate-50/70 dark:bg-slate-950/40' 
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {/* Time Label Column */}
                  <div className={`w-16 sm:w-20 md:w-24 px-3 py-3.5 text-xs font-semibold border-r flex items-center justify-center shrink-0 ${
                    !isOpenSlot && !appt 
                      ? 'text-slate-400 dark:text-slate-600 bg-slate-100/50 dark:bg-slate-950/80 border-slate-200/80 dark:border-slate-800' 
                      : 'text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40'
                  }`}>
                    {time}
                  </div>

                  {/* Slot Content Area */}
                  <div className="flex-1 p-2 min-h-13 flex items-center">
                    {appt ? (
                      /* Scheduled Appointment Row Card */
                      <div 
                        onClick={() => setSelectedAppointment(appt)}
                        className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border cursor-pointer transition-all gap-2 sm:gap-4 hover:shadow-xs ${statusCfg?.badge}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${statusCfg?.indicator}`} />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold truncate">{getPatientName(appt)}</p>
                            <p className="text-[11px] opacity-80 truncate">
                              {getAppointmentTypeLabel(appt.appointment_type_code)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-0 border-current/10 pt-2 sm:pt-0">
                          <span className="text-xs font-mono opacity-80 flex items-center gap-1">
                            <FiPhone className="text-xs inline" />
                            {getPatientPhone(appt)}
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full border border-current/20 font-semibold">
                            {statusCfg?.label}
                          </span>
                        </div>
                      </div>
                    ) : isOpenSlot ? (
                      /* Available Working Slot Trigger */
                      <button 
                        onClick={() => handleOpenCreate(targetDayStr, time)}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 border border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 rounded-lg transition-all flex items-center gap-2"
                      >
                        <FiPlus className="text-xs" />
                        <span>Διαθέσιμο slot — Κάντε κλικ για νέα καταχώρηση</span>
                      </button>
                    ) : (
                      /* Non-Working Hours State */
                      <div className="flex items-center gap-2 px-3 text-slate-400 dark:text-slate-600 select-none">
                        <FiSlash className="text-xs" />
                        <span className="text-xs font-medium uppercase tracking-wider text-[10px]">
                          Εκτός ωραρίου λειτουργίας
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Week View Grid */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-x-auto">
          <div className="min-w-175">
            {/* Grid Header */}
            <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80">
              <div className="p-3 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">
                Ώρα
              </div>
              {daysOfWeek.map((day) => {
                const dayNum = day.dateObject.getDay();
                const dayKey = String(dayNum);
                const isDayClosed = !workingHours[dayKey] || workingHours[dayKey].length === 0;

                return (
                  <div 
                    key={day.name} 
                    className={`p-3 text-center border-r border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${
                      isDayClosed ? 'bg-slate-400/50 dark:bg-slate-950/60' : ''
                    }`}
                  >
                    <p className={`text-xs font-semibold truncate ${isDayClosed ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                      {day.name}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{day.formattedDate}</p>
                    {isDayClosed && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mt-1">
                        Κλειστά
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dynamicTimeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8">
                  {/* Time Axis Column */}
                  <div className="p-2.5 text-center text-xs font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-50/40 dark:bg-slate-900/60 border-r border-slate-100 dark:border-slate-800 flex items-center justify-center sticky left-0 z-10">
                    {time}
                  </div>

                  {/* Day Slots */}
                  {daysOfWeek.map((day) => {
                    const isOpenSlot = isTimeWithinWorkingHours(day.dateObject, time);
                    const appt = activeAppointments.find(a => isSlotMatching(a.start_at, day.isoString, time));
                    const statusCfg = appt ? (STATUS_CONFIG[appt.status] || STATUS_CONFIG.booked) : null;

                    return (
                      <div 
                        key={day.name} 
                        className={`p-1 min-h-14 border-r border-slate-100 dark:border-slate-800 last:border-0 flex items-center transition-colors ${
                          !isOpenSlot && !appt 
                            ? 'bg-slate-400/50 dark:bg-slate-950/50' 
                            : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        {appt ? (
                          /* Compact Appointment Card for Week Grid */
                          <div 
                            onClick={() => setSelectedAppointment(appt)}
                            className={`w-full h-full p-2 rounded-md text-[11px] font-medium border cursor-pointer overflow-hidden transition-all hover:shadow-xs flex flex-col justify-between ${statusCfg?.badge}`}
                          >
                            <div className="font-semibold truncate leading-tight">{getPatientName(appt)}</div>
                            <div className="text-[10px] opacity-75 truncate">{getAppointmentTypeLabel(appt.appointment_type_code)}</div>
                          </div>
                        ) : isOpenSlot ? (
                          /* Clean Quick Add Hover Trigger */
                          <button 
                            className="w-full h-full text-slate-300 hover:text-blue-600 dark:text-slate-700 dark:hover:text-blue-400 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer text-sm font-semibold hover:bg-blue-50/50 dark:hover:bg-blue-950/30 rounded transition-all" 
                            onClick={() => handleOpenCreate(day.isoString, time)}
                            title="Προσθήκη Ραντεβού"
                            aria-label={`Προσθήκη ραντεβού στις ${time}`}
                          >
                            <FiPlus />
                          </button>
                        ) : (
                          /* Closed Cell Indicator */
                          <div className="w-full h-full flex items-center justify-center opacity-20 select-none">
                            <span className="text-xs text-red-600 dark:text-slate-600">—</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Appointment Detail Sidebar Panel */}
      {selectedAppointment && (
        <AppointmentDetailsPanel 
          appointment={selectedAppointment} 
          onClose={() => setSelectedAppointment(null)} 
          onStateChange={fetchContextAppointments}
        />        
      )}

      {/* Create Appointment Modal */}
      {isCreateOpen && (
        <CreateAppointmentModal 
          initialDate={selectedSlot?.date}
          initialTime={selectedSlot?.time}
          onClose={() => {
            setIsCreateOpen(false);
            setSelectedSlot(null);
          }} 
          onSuccess={() => {
            setIsCreateOpen(false);
            setSelectedSlot(null);
            fetchContextAppointments(true);
          }} 
        />
      )}
    </div>
  );
}