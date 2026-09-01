'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppointmentDetailsPanel from '@/components/appointment-details';
import CreateAppointmentModal from '@/components/create-appointment-modal';
import { Appointment, AppointmentStatus } from '@/types';
import { api } from '@/services/api';
import { BsChevronBarLeft, BsChevronBarRight } from "react-icons/bs";

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', 
  '17:00', '17:30', '18:00'
];

export default function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

  const formatDateString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
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
    if (!typeCode) return 'Γενική Επίσκεψη';
    
    const lower = typeCode.toLowerCase().trim();
    switch (lower) {
      case 'cleaning':
      case 'teeth_cleaning':
        return 'Καθαρισμός';
      case 'examination':
      case 'exam':
      case 'checkup':
        return 'Εξέταση / Έλεγχος';
      case 'consultation':
      case 'consult':
        return 'Συμβουλευτική';
      case 'treatment':
        return 'Θεραπεία';
      case 'followup':
      case 'follow_up':
        return 'Επανεξέταση';
      case 'emergency':
        return 'Έκτακτο';
      case 'extraction':
        return 'Εξαγωγή';
      case 'whitening':
        return 'Λεύκανση';
      case 'regular':
        return 'Τακτικό';
      default:
        return typeCode;
    }
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

  const loadAppointments = async () => {
    try {
      setIsLoading(true);

      const dayStr = formatDateString(currentDate);
      let startAt = '';
      let endAt = '';

      if (viewMode === 'day') {
        startAt = `${dayStr}T00:00:00.000Z`;
        endAt = `${dayStr}T23:59:59.999Z`;
      } else {
        const currentDaysOfWeek = getDaysOfWeek(currentDate);
        startAt = `${currentDaysOfWeek[0].isoString}T00:00:00.000Z`;
        endAt = `${currentDaysOfWeek[6].isoString}T23:59:59.999Z`;
      }

      const data = await api.getAppointments({ startAt, endAt });

      if (data && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else if (Array.isArray(data)) {
        setAppointments(data);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('Σφάλμα κατά τη φόρτωση των ραντεβού:', err);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode]);

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
      case 'booked': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'completed': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'booked': return 'Επιβεβαιώμενο';
      case 'pending': return 'Σε αναμονή';
      case 'completed': return 'Ολοκληρώθηκε';
      default: return 'Διαθέσιμο';
    }
  };

  const activeAppointments = appointments.filter(a => a.status !== 'cancelled');

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* Top Controls Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Toggle View & Main Action Button */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            <button 
              onClick={() => setViewMode('day')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Ημέρα
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Εβδομάδα
            </button>
          </div>

          <button 
            onClick={() => handleOpenCreate()}
            className="sm:hidden px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
          >
            + Νέο
          </button>
        </div>

        {/* Navigation & Dates */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
            <button 
              onClick={handlePrev}
              className="flex items-center justify-center p-1.5 px-2.5 sm:px-3 text-slate-600 hover:bg-slate-50 border-r border-slate-200 transition-colors text-xs font-bold"
              title="Προηγούμενο"
            >
              <BsChevronBarLeft className='text-lg sm:text-xl sm:mr-1'/> 
              <span className="hidden sm:inline">{viewMode === 'day' ? 'Προηγούμενη Ημέρα' : 'Προηγούμενη Εβδομάδα'}</span>
            </button>
            <button 
              onClick={handleNext}
              className="flex items-center justify-center p-1.5 px-2.5 sm:px-3 text-slate-600 hover:bg-slate-50 transition-colors text-xs font-bold"
              title="Επόμενο"
            >
              <span className="hidden sm:inline">{viewMode === 'day' ? 'Επόμενη Ημέρα' : 'Επόμενη Εβδομάδα'}</span>
              <BsChevronBarRight className='text-lg sm:text-xl sm:ml-1'/>
            </button>
          </div>

          <div className="text-xs sm:text-sm font-semibold text-slate-800 text-center capitalize flex items-center justify-center gap-1.5 min-w-[140px] sm:min-w-[180px]">
            {viewMode === 'day' 
              ? currentDate.toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'short' })
              : `${daysOfWeek[0].formattedDate} - ${daysOfWeek[6].formattedDate}`
            }
            {isLoading && (
              <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <button 
              onClick={handleToday}
              className="px-2.5 sm:px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg"
            >
              Σήμερα
            </button>
            <button 
              onClick={() => handleOpenCreate()}
              className="hidden sm:block px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
            >
              + Νέο Ραντεβού
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <span className="text-xl sm:text-2xl shrink-0">📅</span>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
              {activeAppointments.filter(a => a.start_at && a.start_at.includes(formatDateString(currentDate))).length}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Ενεργά Ραντεβού</p>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <span className="text-xl sm:text-2xl shrink-0">🕒</span>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
              {Math.max(0, TIME_SLOTS.length - activeAppointments.filter(a => a.start_at && a.start_at.includes(formatDateString(currentDate))).length)}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Κενά Slots</p>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <span className="text-xl sm:text-2xl shrink-0">❌</span>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
              {appointments.filter(a => a.start_at && a.start_at.includes(formatDateString(currentDate)) && a.status === 'cancelled').length}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Ακυρώσεις</p>
          </div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 col-span-2 lg:col-span-1">
          <span className="text-xl sm:text-2xl text-emerald-500 shrink-0">🔄</span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-emerald-600 truncate">Συνδεδεμένο</p>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Live Supabase Database</p>
          </div>
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {TIME_SLOTS.map((time) => {
              const targetDayStr = formatDateString(currentDate);
              const appt = activeAppointments.find(a => isSlotMatching(a.start_at, targetDayStr, time));

              return (
                <div key={time} className="flex hover:bg-slate-50/50 transition-colors">
                  <div className="w-16 sm:w-24 px-2 sm:px-4 py-3 text-[11px] sm:text-xs font-bold text-slate-400 border-r border-slate-100 flex items-center justify-center bg-slate-50/30 shrink-0">
                    {time}
                  </div>
                  <div className="flex-1 p-1.5 sm:p-2 min-h-[56px] flex items-center overflow-hidden">
                    {appt ? (
                      <div 
                        onClick={() => setSelectedAppointment(appt)}
                        className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all gap-2 sm:gap-4 ${
                          appt.status === 'booked' ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50' :
                          appt.status === 'pending' ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50' :
                          'border-purple-200 bg-purple-50/40 hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                          <div className={`w-1.5 h-6 sm:h-8 rounded-full shrink-0 ${
                            appt.status === 'booked' ? 'bg-emerald-500' :
                            appt.status === 'pending' ? 'bg-amber-500' : 'bg-purple-500'
                          }`} />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{getPatientName(appt)}</p>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                              {getAppointmentTypeLabel(appt.appointment_type_code)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 shrink-0 border-t sm:border-0 border-slate-200/40 pt-1.5 sm:pt-0">
                          <span className="text-[11px] sm:text-xs font-medium text-slate-600 truncate">{getPatientPhone(appt)}</span>
                          <span className={`text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border font-semibold ${getStatusBadgeStyles(appt.status)}`}>
                            {getStatusLabel(appt.status)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleOpenCreate(targetDayStr, time)}
                        className="w-full text-left px-3 sm:px-4 py-2 text-xs text-slate-400 hover:text-blue-600 border border-dashed border-transparent hover:border-blue-200 hover:bg-blue-50/30 rounded-lg transition-all"
                      >
                        + <span className="hidden sm:inline">Διαθέσιμο ραντεβού</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Week View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/50">
              <div className="p-2 sm:p-3 text-center text-xs font-bold text-slate-400 border-r border-slate-100 sticky left-0 bg-slate-50 z-10">
                Ώρα
              </div>
              {daysOfWeek.map((day) => (
                <div key={day.name} className="p-2 sm:p-3 text-center border-r border-slate-100 last:border-0">
                  <p className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">{day.name}</p>
                  <p className="text-[9px] sm:text-[10px] font-medium text-slate-400">{day.formattedDate}</p>
                </div>
              ))}
            </div>
            <div className="divide-y divide-slate-100">
              {TIME_SLOTS.map((time) => (
                <div key={time} className="grid grid-cols-8">
                  <div className="p-2 sm:p-3 text-center text-[11px] sm:text-xs font-bold text-slate-400 bg-slate-50/80 border-r border-slate-100 flex items-center justify-center sticky left-0 z-10">
                    {time}
                  </div>
                  {daysOfWeek.map((day) => {
                    const appt = activeAppointments.find(a => isSlotMatching(a.start_at, day.isoString, time));

                    return (
                      <div key={day.name} className="p-1 min-h-[50px] sm:min-h-[60px] border-r border-slate-100 last:border-0 bg-white flex items-center">
                        {appt ? (
                          <div 
                            onClick={() => setSelectedAppointment(appt)}
                            className={`w-full p-1 sm:p-1.5 rounded text-[9px] sm:text-[10px] font-medium border cursor-pointer overflow-hidden ${
                              appt.status === 'booked' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                              appt.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                              'bg-purple-50 border-purple-200 text-purple-800'
                            }`}
                          >
                            <div className="font-bold truncate">{getPatientName(appt)}</div>
                            <div className="opacity-75 truncate hidden sm:block">{getAppointmentTypeLabel(appt.appointment_type_code)}</div>
                          </div>
                        ) : (
                          <div 
                            className="w-full h-full text-center text-slate-300 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer text-xs font-bold hover:bg-blue-50/40 rounded transition-all" 
                            onClick={() => handleOpenCreate(day.isoString, time)}
                          >
                            +
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

      {/* Modals & Panels */}
      {selectedAppointment && (
        <AppointmentDetailsPanel 
          appointment={selectedAppointment} 
          onClose={() => setSelectedAppointment(null)} 
          onStateChange={loadAppointments}
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
            loadAppointments();
          }} 
        />
      )}
    </div>
  );
}