'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppointmentDetailsPanel from '@/components/appointment-details';
import CreateAppointmentModal from '@/components/create-appointment-modal';
import { Appointment, AppointmentStatus } from '@/types';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';
import { BsChevronBarLeft, BsChevronBarRight } from "react-icons/bs";

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

export default function AppointmentsPage() {
  const { selectedClinic } = useClinic();
  const { settings, fetchSettings, fetchAppointments: fetchContextAppointments, appointments: contextAppointments } = useDashboard(); 
  
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
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

  const getStatusBadgeStyles = (status: AppointmentStatus) => {
    switch (status) {
      case 'booked': return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
      case 'pending': return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
      case 'rescheduled': return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60';
      case 'expired': return 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700';
      case 'failed': return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60';
      case 'cancelled': return 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60';
      default: return 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'booked': return 'Επιβεβαιώμενο';
      case 'pending': return 'Σε αναμονή';
      case 'rescheduled': return 'Επαναπρογραμματισμένο';
      case 'expired': return 'Έληξε';
      case 'failed': return 'Απέτυχε';
      case 'cancelled': return 'Ακυρώθηκε';
      default: return 'Διαθέσιμο';
    }
  };

  const activeAppointments = appointments.filter(a => a.status !== 'cancelled');

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* Top Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button 
              onClick={() => setViewMode('day')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'day' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Ημέρα
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Εβδομάδα
            </button>
          </div>

          <button 
            onClick={() => handleOpenCreate()}
            className="sm:hidden px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            + Νέο
          </button>
        </div>

        {/* Navigation & Dates */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <button 
              onClick={handlePrev}
              className="flex items-center justify-center p-2 px-2.5 sm:px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-colors text-xs font-bold"
              title="Προηγούμενο"
            >
              <BsChevronBarLeft className='text-base sm:text-lg sm:mr-1'/> 
              <span className="hidden sm:inline">{viewMode === 'day' ? 'Προηγούμενη Ημέρα' : 'Προηγούμενη Εβδομάδα'}</span>
            </button>
            <button 
              onClick={handleNext}
              className="flex items-center justify-center p-2 px-2.5 sm:px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
              title="Επόμενο"
            >
              <span className="hidden sm:inline">{viewMode === 'day' ? 'Επόμενη Ημέρα' : 'Επόμενη Εβδομάδα'}</span>
              <BsChevronBarRight className='text-base sm:text-lg sm:ml-1'/>
            </button>
          </div>

          <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 text-center capitalize flex items-center justify-center gap-1.5 min-w-[130px] sm:min-w-[170px]">
            {viewMode === 'day' 
              ? currentDate.toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'short' })
              : `${daysOfWeek[0].formattedDate} - ${daysOfWeek[6].formattedDate}`
            }
          </div>

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <button 
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
            >
              Σήμερα
            </button>
            <button 
              onClick={() => handleOpenCreate()}
              className="hidden sm:block px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
            >
              + Νέο Ραντεβού
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <span className="text-xl sm:text-2xl shrink-0">📅</span>
          <div className="min-w-0">
            <p className="text-base sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {activeAppointments.filter(a => a.start_at && a.start_at.includes(formatDateString(currentDate))).length}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Ενεργά Ραντεβού</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <span className="text-xl sm:text-2xl shrink-0">🕒</span>
          <div className="min-w-0">
            <p className="text-base sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {Math.max(0, dynamicTimeSlots.filter(t => isTimeWithinWorkingHours(currentDate, t)).length - activeAppointments.filter(a => a.start_at && a.start_at.includes(formatDateString(currentDate))).length)}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Διαθέσιμα Slots</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <span className="text-xl sm:text-2xl shrink-0">❌</span>
          <div className="min-w-0">
            <p className="text-base sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {appointments.filter(a => a.start_at && a.start_at.includes(formatDateString(currentDate)) && a.status === 'cancelled').length}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Ακυρώσεις</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 col-span-2 lg:col-span-1">
          <span className="text-xl sm:text-2xl text-blue-500 shrink-0">🔄</span>
          <div className="min-w-0">
            <p className="text-sm sm:text-xl font-bold text-blue-600 dark:text-blue-400 truncate">
              {appointments.filter(a => a.status === 'rescheduled').length}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Επαναπρογραμματισμένα</p>
          </div>
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dynamicTimeSlots.map((time) => {
              const targetDayStr = formatDateString(currentDate);
              const isOpenSlot = isTimeWithinWorkingHours(currentDate, time);
              const appt = activeAppointments.find(a => isSlotMatching(a.start_at, targetDayStr, time));

              return (
                <div 
                  key={time} 
                  className={`flex transition-colors ${!isOpenSlot && !appt ? 'bg-slate-50/60 dark:bg-slate-950/60' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}`}
                >
                  <div className="w-14 sm:w-20 md:w-24 px-1.5 sm:px-3 py-3 text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-800 flex items-center justify-center bg-slate-50/40 dark:bg-slate-900/50 shrink-0">
                    {time}
                  </div>
                  <div className="flex-1 p-1.5 sm:p-2 min-h-[52px] flex items-center overflow-hidden">
                    {appt ? (
                      <div 
                        onClick={() => setSelectedAppointment(appt)}
                        className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-xl border cursor-pointer hover:shadow-xs transition-all gap-2 sm:gap-4 ${
                          appt.status === 'booked' ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50' :
                          appt.status === 'pending' ? 'border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/30 hover:bg-amber-50 dark:hover:bg-amber-950/50' :
                          appt.status === 'rescheduled' ? 'border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50' :
                          'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                          <div className={`w-1.5 h-6 sm:h-8 rounded-full shrink-0 ${
                            appt.status === 'booked' ? 'bg-emerald-500' :
                            appt.status === 'pending' ? 'bg-amber-500' :
                            appt.status === 'rescheduled' ? 'bg-blue-500' : 'bg-slate-400'
                          }`} />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{getPatientName(appt)}</p>
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                              {getAppointmentTypeLabel(appt.appointment_type_code)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 shrink-0 border-t sm:border-0 border-slate-200/40 dark:border-slate-700/60 pt-1.5 sm:pt-0">
                          <span className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{getPatientPhone(appt)}</span>
                          <span className={`text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border font-bold ${getStatusBadgeStyles(appt.status)}`}>
                            {getStatusLabel(appt.status)}
                          </span>
                        </div>
                      </div>
                    ) : isOpenSlot ? (
                      <button 
                        onClick={() => handleOpenCreate(targetDayStr, time)}
                        className="w-full text-left px-3 sm:px-4 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 border border-dashed border-transparent hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/30 dark:hover:bg-blue-950/30 rounded-xl transition-all"
                      >
                        + <span className="hidden sm:inline">Διαθέσιμο ραντεβού</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-600 italic px-2 sm:px-4">
                        Εκτός Ωραρίου
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Week View */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="p-2 sm:p-3 text-center text-xs font-bold text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">
                Ώρα
              </div>
              {daysOfWeek.map((day) => {
                const dayNum = day.dateObject.getDay();
                const dayKey = String(dayNum);
                const isDayClosed = !workingHours[dayKey] || workingHours[dayKey].length === 0;

                return (
                  <div key={day.name} className={`p-2 sm:p-3 text-center border-r border-slate-100 dark:border-slate-800 last:border-0 ${isDayClosed ? 'bg-slate-100/50 dark:bg-slate-950/40' : ''}`}>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{day.name}</p>
                    <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 dark:text-slate-500">{day.formattedDate}</p>
                    {isDayClosed && (
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 block mt-0.5">Κλειστά</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dynamicTimeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8">
                  <div className="p-2 sm:p-3 text-center text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-900/80 border-r border-slate-100 dark:border-slate-800 flex items-center justify-center sticky left-0 z-10">
                    {time}
                  </div>
                  {daysOfWeek.map((day) => {
                    const isOpenSlot = isTimeWithinWorkingHours(day.dateObject, time);
                    const appt = activeAppointments.find(a => isSlotMatching(a.start_at, day.isoString, time));

                    return (
                      <div 
                        key={day.name} 
                        className={`p-1 min-h-[50px] sm:min-h-[60px] border-r border-slate-100 dark:border-slate-800 last:border-0 flex items-center ${
                          !isOpenSlot && !appt ? 'bg-slate-100/40 dark:bg-slate-950/50' : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        {appt ? (
                          <div 
                            onClick={() => setSelectedAppointment(appt)}
                            className={`w-full p-1 sm:p-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium border cursor-pointer overflow-hidden ${
                              appt.status === 'booked' ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' :
                              appt.status === 'pending' ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200' :
                              appt.status === 'rescheduled' ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200' :
                              'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className="font-bold truncate">{getPatientName(appt)}</div>
                            <div className="opacity-75 truncate hidden sm:block">{getAppointmentTypeLabel(appt.appointment_type_code)}</div>
                          </div>
                        ) : isOpenSlot ? (
                          <div 
                            className="w-full h-full text-center text-slate-900 dark:text-slate-600 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer text-xs font-bold hover:bg-blue-50/40 dark:hover:bg-blue-950/40 rounded transition-all" 
                            onClick={() => handleOpenCreate(day.isoString, time)}
                          >
                            +
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals & Panels */}
      {selectedAppointment && (
        <AppointmentDetailsPanel 
          appointment={selectedAppointment} 
          onClose={() => setSelectedAppointment(null)} 
          onStateChange={fetchContextAppointments}
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
            fetchContextAppointments(true);
          }} 
        />
      )}
    </div>
  );
}