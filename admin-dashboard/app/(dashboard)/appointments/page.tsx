'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CalendarIcon, 
  ClockIcon, 
  XCircleIcon, 
  ArrowPathIcon, 
  PlusIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PhoneIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';
import AppointmentDetailsPanel from '@/components/appointment-details';
import CreateAppointmentModal from '@/components/create-appointment-modal';
import { Appointment, AppointmentStatus } from '@/types';
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
  consultation: 'Συμβουλευτική',
  general: 'Γενικό Ραντεβού',
  other: 'Άλλο',
  unknown: 'Γενικό Ραντεβού',
};

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; badge: string; indicator: string }> = {
  booked: {
    label: 'Επιβεβαιώμενο',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
    indicator: 'bg-emerald-500 dark:bg-emerald-400',
  },
  pending: {
    label: 'Σε αναμονή',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20',
    indicator: 'bg-amber-500 dark:bg-amber-400',
  },
  rescheduled: {
    label: 'Επαναπρογραμματισμένο',
    badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20 hover:bg-sky-100 dark:hover:bg-sky-500/20',
    indicator: 'bg-sky-500 dark:bg-sky-400',
  },
  expired: {
    label: 'Έληξε',
    badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    indicator: 'bg-slate-400 dark:bg-slate-500',
  },
  failed: {
    label: 'Απέτυχε',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20',
    indicator: 'bg-rose-500',
  },
  cancelled: {
    label: 'Ακυρώθηκε',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20',
    indicator: 'bg-rose-500',
  },
};

export default function AppointmentsPage() {
  const { selectedClinic } = useClinic();
  const { 
    settings, 
    fetchSettings, 
    fetchAppointments, 
    appointments: contextAppointments,
    loadingTab 
  } = useDashboard(); 

  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  const [dynamicTimeSlots, setDynamicTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);

  const actualSettings = settings?.settings || settings || {};
  const workingHours = (actualSettings.working_hours_json && typeof actualSettings.working_hours_json === 'object') ? actualSettings.working_hours_json : {};
  const slotInterval = Number(actualSettings.slot_interval_minutes) || 30;
  const prepsData = actualSettings.appointment_preparation_json || {};

  const formatDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
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

  const daysOfWeek = useMemo(() => getDaysOfWeek(currentDate), [currentDate, getDaysOfWeek]);

  const dateStringKey = formatDateString(currentDate);

  const loadAppointmentsForCurrentView = useCallback((force = false) => {
    const anchor = new Date(currentDate);
    let start: Date;
    let end: Date;

    if (viewMode === 'day') {
      start = new Date(anchor);
      start.setHours(0, 0, 0, 0);
      end = new Date(anchor);
      end.setHours(23, 59, 59, 999);
    } else {
      const currentDay = anchor.getDay();
      const dayIndex = currentDay === 0 ? 6 : currentDay - 1;
      
      const monday = new Date(anchor);
      monday.setDate(anchor.getDate() - dayIndex);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      start = monday;
      end = sunday;
    }

    fetchAppointments({
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      force
    });
  }, [currentDate, viewMode, fetchAppointments]);

  useEffect(() => {
    if (!selectedClinic?.id) return;
    fetchSettings();
    loadAppointmentsForCurrentView(true);
  }, [selectedClinic?.id, dateStringKey, viewMode, fetchSettings, loadAppointmentsForCurrentView]);

  useEffect(() => {
    const allSlots = Object.values(workingHours).flat() as Array<{ start: string; end: string }>;
    if (allSlots.length === 0) {
      setDynamicTimeSlots(DEFAULT_TIME_SLOTS);
      return;
    }

    let minStartMinutes = 24 * 60;
    let maxEndMinutes = 0;

    allSlots.forEach((slot) => {
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
    const dayKey = String(dayNum === 0 ? 7 : dayNum); 

    const daySlots: any = workingHours[dayKey] || workingHours[String(dayNum)];
    if (!daySlots || !Array.isArray(daySlots) || daySlots.length === 0) return false;

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

    if (typeof rawPrep === 'string' && rawPrep.startsWith('[TITLE:')) {
      const match = rawPrep.match(/^\[TITLE:\s*(.*?)\]/);
      if (match && match[1]) return match[1];
    }

    return GREEK_LABEL_MAP[typeCode] || typeCode.replace(/_/g, ' ');
  };

  const getPatientName = (appt: any) => {
    if (!appt) return 'Ανώνυμος Ασθενής';
    return appt.caller_name || appt.patient_name || appt.patient?.name || 'Ανώνυμος Ασθενής';
  };

  const getPatientPhone = (appt: any) => {
    if (!appt) return '-';
    return appt.phone_normalized || appt.phone || appt.callback_phone || '-';
  };

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
    const targetDate = dateStr || dateStringKey;
    const targetTime = timeStr || '09:00';
    
    setSelectedSlot({ date: targetDate, time: targetTime });
    setIsCreateOpen(true);
  };

  const appointmentsList = contextAppointments || [];
  const activeAppointments = useMemo(
    () => appointmentsList.filter((a: any) => a.status !== 'cancelled'),
    [appointmentsList]
  );

  const stats = useMemo(() => {
    if (viewMode === 'day') {
      const activeToday = activeAppointments.filter((a: any) => a.start_at && a.start_at.includes(dateStringKey)).length;
      const workingSlotCount = dynamicTimeSlots.filter(t => isTimeWithinWorkingHours(currentDate, t)).length;
      const openSlots = Math.max(0, workingSlotCount - activeToday);
      const cancelledToday = appointmentsList.filter((a: any) => a.start_at && a.start_at.includes(dateStringKey) && a.status === 'cancelled').length;
      const rescheduledTotal = appointmentsList.filter((a: any) => a.status === 'rescheduled').length;

      return { activeToday, openSlots, cancelledToday, rescheduledTotal };
    } else {
      // Week view calculations across all 7 days of the week
      const weekIsoStrings = new Set(daysOfWeek.map(d => d.isoString));
      
      const activeWeek = activeAppointments.filter((a: any) => {
        if (!a.start_at) return false;
        const aDateStr = a.start_at.split('T')[0];
        return weekIsoStrings.has(aDateStr);
      }).length;

      let totalWorkingSlots = 0;
      daysOfWeek.forEach(day => {
        const slotsCount = dynamicTimeSlots.filter(t => isTimeWithinWorkingHours(day.dateObject, t)).length;
        totalWorkingSlots += slotsCount;
      });

      const openSlots = Math.max(0, totalWorkingSlots - activeWeek);

      const cancelledWeek = appointmentsList.filter((a: any) => {
        if (!a.start_at || a.status !== 'cancelled') return false;
        const aDateStr = a.start_at.split('T')[0];
        return weekIsoStrings.has(aDateStr);
      }).length;

      const rescheduledTotal = appointmentsList.filter((a: any) => a.status === 'rescheduled').length;

      return { activeToday: activeWeek, openSlots, cancelledToday: cancelledWeek, rescheduledTotal };
    }
  }, [viewMode, activeAppointments, appointmentsList, currentDate, dateStringKey, daysOfWeek, dynamicTimeSlots, workingHours]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 min-h-dvh text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/30">
      
      {/* Header Toolbar */}
      <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 shadow-sm space-y-4">
        
        {/* Top Row: View Toggle, Centralized Navigation & New Appointment Button */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 w-full lg:w-auto">
            {/* Day / Week Switcher */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-[#090D14] rounded-xl border border-slate-200 dark:border-slate-800/80 shrink-0">
              <button 
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'day' 
                    ? 'bg-white dark:bg-[#101622] text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700/50' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Ημέρα
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'week' 
                    ? 'bg-white dark:bg-[#101622] text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700/50' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Εβδομάδα
              </button>
            </div>

            {/* Centralized Navigation Controls & Active Period Label */}
            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-[#090D14] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101622]">
                <button 
                  onClick={handlePrev}
                  className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border-r border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                  aria-label="Προηγούμενη περίοδος"
                >
                  <ChevronLeftIcon className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button 
                  onClick={handleToday}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors border-r border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Σήμερα
                </button>
                <button 
                  onClick={handleNext}
                  className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  aria-label="Επόμενη περίοδος"
                >
                  <ChevronRightIcon className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 px-1">
                <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="capitalize truncate">
                  {viewMode === 'day' 
                    ? currentDate.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : `${daysOfWeek[0].formattedDate} — ${daysOfWeek[6].formattedDate}`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* New Appointment Button */}
          <div className="flex items-center w-full lg:w-auto justify-end">
            <button 
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <PlusIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Νέο Ραντεβού</span>
            </button>
          </div>

        </div>

        {/* Bottom Row: Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#090D14] border border-slate-100 dark:border-slate-800/80">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider truncate">Ενεργά</p>
              <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">{stats.activeToday}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#090D14] border border-slate-100 dark:border-slate-800/80">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 shrink-0">
              <ClockIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider truncate">Slots</p>
              <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">{stats.openSlots}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#090D14] border border-slate-100 dark:border-slate-800/80">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 shrink-0">
              <XCircleIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider truncate">Ακυρώσεις</p>
              <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">{stats.cancelledToday}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#090D14] border border-slate-100 dark:border-slate-800/80">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 shrink-0">
              <ArrowPathIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider truncate">Μεταβολές</p>
              <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">{stats.rescheduledTotal}</p>
            </div>
          </div>
        </div>

      </div>

      {loadingTab === 'appointments' ? (
        <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-12 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
          <ArrowPathIcon className="w-5 h-5 animate-spin text-slate-700 dark:text-emerald-400" />
          <span>Φόρτωση προγράμματος ραντεβού...</span>
        </div>
      ) : viewMode === 'day' ? (
        <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
          {dynamicTimeSlots.map((time) => {
            const isOpenSlot = isTimeWithinWorkingHours(currentDate, time);
            const appt = activeAppointments.find((a: any) => isSlotMatching(a.start_at, dateStringKey, time));
            const statusCfg = appt ? (STATUS_CONFIG[appt.status as AppointmentStatus] || STATUS_CONFIG.booked) : null;

            return (
              <div 
                key={time} 
                className={`flex flex-col sm:flex-row transition-colors ${
                  !isOpenSlot && !appt 
                    ? 'bg-slate-50/60 dark:bg-[#090D14]/60' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'
                }`}
              >
                <div className={`w-full sm:w-24 px-4 py-2 sm:py-3.5 text-xs font-mono font-semibold border-b sm:border-b-0 sm:border-r flex items-center justify-between sm:justify-center shrink-0 ${
                  !isOpenSlot && !appt 
                    ? 'text-slate-400 dark:text-slate-600 bg-slate-100/50 dark:bg-[#090D14] border-slate-200 dark:border-slate-800/80' 
                    : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0D121C]'
                }`}>
                  <span>{time}</span>
                  <span className="sm:hidden text-[10px] text-slate-400">
                    {appt ? 'Κρατημένο' : isOpenSlot ? 'Διαθέσιμο' : 'Κλειστό'}
                  </span>
                </div>

                <div className="flex-1 p-2 sm:p-3 min-h-13 flex items-center">
                  {appt ? (
                    <div 
                      onClick={() => setSelectedAppointment(appt)}
                      className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border cursor-pointer transition-all gap-2 sm:gap-4 ${statusCfg?.badge}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusCfg?.indicator}`} />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate text-slate-900 dark:text-slate-100">{getPatientName(appt)}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {getAppointmentTypeLabel(appt.appointment_type_code)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-0 border-slate-200/60 dark:border-slate-800 pt-2 sm:pt-0">
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <PhoneIcon className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {getPatientPhone(appt)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md border font-semibold">
                          {statusCfg?.label}
                        </span>
                      </div>
                    </div>
                  ) : isOpenSlot ? (
                    <button 
                      onClick={() => handleOpenCreate(dateStringKey, time)}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-emerald-400 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-emerald-500/40 hover:bg-slate-50 dark:hover:bg-emerald-500/5 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Διαθέσιμο slot — Κάντε κλικ για νέα καταχώρηση</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 text-slate-400 dark:text-slate-600 select-none py-1">
                      <NoSymbolIcon className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">
                        Εκτός ωραρίου
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-xl overflow-x-auto">
          <div className="min-w-187.5">
            <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D121C]">
              <div className="p-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-500 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-[#0D121C] z-10">
                Ώρα
              </div>
              {daysOfWeek.map((day) => {
                const dayNum = day.dateObject.getDay();
                const dayKey = String(dayNum === 0 ? 7 : dayNum);
                const daySlots = workingHours[dayKey] || workingHours[String(dayNum)];
                const isDayClosed = !daySlots || !Array.isArray(daySlots) || daySlots.length === 0;

                return (
                  <div 
                    key={day.name} 
                    className={`p-3 text-center border-r border-slate-200 dark:border-slate-800/80 last:border-0 transition-colors ${
                      isDayClosed ? 'bg-slate-100/60 dark:bg-[#090D14]/80' : ''
                    }`}
                  >
                    <p className={`text-xs font-semibold truncate ${isDayClosed ? 'text-slate-400 dark:text-slate-600' : 'text-slate-700 dark:text-slate-200'}`}>
                      {day.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">{day.formattedDate}</p>
                    {isDayClosed && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600 block mt-1">
                        Κλειστά
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {dynamicTimeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8">
                  <div className="p-2 text-center text-xs font-mono font-medium text-slate-500 bg-slate-50 dark:bg-[#0D121C] border-r border-slate-200 dark:border-slate-800 flex items-center justify-center sticky left-0 z-10">
                    {time}
                  </div>

                  {daysOfWeek.map((day) => {
                    const isOpenSlot = isTimeWithinWorkingHours(day.dateObject, time);
                    const appt = activeAppointments.find((a: any) => isSlotMatching(a.start_at, day.isoString, time));
                    const statusCfg = appt ? (STATUS_CONFIG[appt.status as AppointmentStatus] || STATUS_CONFIG.booked) : null;

                    return (
                      <div 
                        key={day.name} 
                        className={`p-1.5 min-h-16 border-r border-slate-100 dark:border-slate-800/80 last:border-0 flex items-center transition-colors ${
                          !isOpenSlot && !appt 
                            ? 'bg-red-100 dark:bg-[#090D14]/60' 
                            : 'bg-white dark:bg-[#101622]'
                        }`}
                      >
                        {appt ? (
                          <div 
                            onClick={() => setSelectedAppointment(appt)}
                            className={`w-full h-full p-2.5 rounded-xl text-[11px] font-medium border cursor-pointer overflow-hidden transition-all flex flex-col justify-between shadow-xs ${statusCfg?.badge}`}
                          >
                            <div className="font-semibold truncate leading-tight text-slate-900 dark:text-slate-100">{getPatientName(appt)}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-1">{getAppointmentTypeLabel(appt.appointment_type_code)}</div>
                          </div>
                        ) : isOpenSlot ? (
                          <button 
                            className="w-full h-full text-slate-300 hover:text-slate-700 dark:text-slate-600 dark:hover:text-emerald-400 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer text-sm font-semibold hover:bg-slate-100 dark:hover:bg-emerald-500/5 rounded-xl transition-all" 
                            onClick={() => handleOpenCreate(day.isoString, time)}
                            title="Προσθήκη Ραντεβού"
                            aria-label={`Προσθήκη ραντεβού στις ${time}`}
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-20 select-none">
                            <span className="text-xs text-slate-400 dark:text-slate-700">—</span>
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

      {selectedAppointment && (
        <AppointmentDetailsPanel 
          appointment={selectedAppointment} 
          onClose={() => setSelectedAppointment(null)} 
          onStateChange={() => loadAppointmentsForCurrentView(true)}
        />       
      )}

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
            loadAppointmentsForCurrentView(true);
          }} 
        />
      )}
    </div>
  );
}