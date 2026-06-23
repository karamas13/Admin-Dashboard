'use client';

import React, { useState } from 'react';
import AppointmentDetailsPanel from '@/components/appointment-details';
import CreateAppointmentModal from '@/components/create-appointment-modal';
import { Appointment, AppointmentStatus } from '@/types';

// Mock Data for immediate visual presentation matching UI mockup
const INITIAL_APPOINTMENTS: Appointment[] = [
  { appointment_id: '1', caller_name: 'Μαρία Παπαδοπούλου', phone: '694 123 4567', appointment_type_code: 'Καθαρισμός', urgency_code: 'normal', start_at: '2026-06-19T09:00:00+03:00', duration_minutes: 30, status: 'booked', google_sync_status: 'healthy' },
  { appointment_id: '2', caller_name: 'Κώστας Ιωάννου', phone: '697 987 6543', appointment_type_code: 'Έλεγχος', urgency_code: 'normal', start_at: '2026-06-19T09:30:00+03:00', duration_minutes: 30, status: 'booked', google_sync_status: 'healthy' },
  { appointment_id: '3', caller_name: 'Νίκος Δημητρίου', phone: '698 555 1122', appointment_type_code: 'Σφράγισμα', urgency_code: 'normal', start_at: '2026-06-19T10:30:00+03:00', duration_minutes: 30, status: 'booked', google_sync_status: 'healthy' },
  { appointment_id: '4', caller_name: 'Ελένη Καραμάνου', phone: '694 222 3344', appointment_type_code: 'Έλεγχος', urgency_code: 'high', start_at: '2026-06-19T11:00:00+03:00', duration_minutes: 30, status: 'pending', google_sync_status: 'pending' },
  { appointment_id: '5', caller_name: 'Παναγιώτης Πρωτοψάλτης', phone: '697 111 2233', appointment_type_code: 'Πόνος', urgency_code: 'emergency', start_at: '2026-06-19T12:00:00+03:00', duration_minutes: 30, status: 'booked', google_sync_status: 'healthy' },
  { appointment_id: '6', caller_name: 'Γιώργος Σταθόπουλος', phone: '694 333 2211', appointment_type_code: 'Λεύκανση', urgency_code: 'normal', start_at: '2026-06-19T13:30:00+03:00', duration_minutes: 30, status: 'completed', google_sync_status: 'healthy' },
  { appointment_id: '7', caller_name: 'Άννα Μαρκοπούλου', phone: '694 888 7766', appointment_type_code: 'Ακύρωση', urgency_code: 'normal', start_at: '2026-06-19T14:30:00+03:00', duration_minutes: 30, status: 'cancelled', google_sync_status: 'healthy' },
];

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', 
  '17:00', '17:30', '18:00'
];

const DAYS_OF_WEEK = [
  { name: 'Δευτέρα', date: '15/06' },
  { name: 'Τρίτη', date: '16/06' },
  { name: 'Τετάρτη', date: '17/06' },
  { name: 'Πέμπτη', date: '18/06' },
  { name: 'Παρασκευή', date: '19/06' },
  { name: 'Σάββατο', date: '20/06' },
  { name: 'Κυριακή', date: '21/06' }
];

export default function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const getStatusBadgeStyles = (status: AppointmentStatus) => {
    switch (status) {
      case 'booked': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'completed': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'booked': return 'Επιβεβαιώμενο';
      case 'pending': return 'Σε αναμονή';
      case 'cancelled': return 'Ακυρώθηκε';
      case 'completed': return 'Ολοκληρώθηκε';
      default: return 'Διαθέσιμο';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('day')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Ημέρα
          </button>
          <button 
            onClick={() => setViewMode('week')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Εβδομάδα
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-slate-800">Πέμπτη, 19 Ιουνίου 2026</div>
          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg">Σήμερα</button>
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
          >
            + Νέο Ραντεβού
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <span className="text-2xl">📅</span>
          <div>
            <p className="text-2xl font-bold text-slate-900">12</p>
            <p className="text-xs text-slate-500 font-medium">Ραντεβού σήμερα</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <span className="text-2xl">🕒</span>
          <div>
            <p className="text-2xl font-bold text-slate-900">8</p>
            <p className="text-xs text-slate-500 font-medium">Διαθέσιμα ραντεβού</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <span className="text-2xl">📞</span>
          <div>
            <p className="text-2xl font-bold text-slate-900">2</p>
            <p className="text-xs text-slate-500 font-medium">Αιτήματα επικοινωνίας</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <span className="text-2xl text-emerald-500">🔄</span>
          <div>
            <p className="text-sm font-bold text-emerald-600">Όλα εντάξει</p>
            <p className="text-xs text-slate-500 font-medium">Google Sync</p>
          </div>
        </div>
      </div>

      {/* Primary Scheduling Calendar Interface */}
      {viewMode === 'day' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {TIME_SLOTS.map((time) => {
              const appt = appointments.find(a => a.start_at.includes(time));
              return (
                <div key={time} className="flex hover:bg-slate-50/50 transition-colors">
                  <div className="w-24 px-4 py-4 text-xs font-bold text-slate-400 border-r border-slate-100 flex items-center justify-center bg-slate-50/30">
                    {time}
                  </div>
                  <div className="flex-1 p-2 min-h-[56px] flex items-center">
                    {appt ? (
                      <div 
                        onClick={() => setSelectedAppointment(appt)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                          appt.status === 'booked' ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50' :
                          appt.status === 'pending' ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50' :
                          appt.status === 'cancelled' ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50 line-through text-slate-400' :
                          'border-purple-200 bg-purple-50/40 hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-1.5 h-8 rounded-full ${
                            appt.status === 'booked' ? 'bg-emerald-500' :
                            appt.status === 'pending' ? 'bg-amber-500' :
                            appt.status === 'cancelled' ? 'bg-rose-500' : 'bg-purple-500'
                          }`} />
                          <div>
                            <p className="text-sm font-bold text-slate-800">{appt.caller_name}</p>
                            <p className="text-xs text-slate-500 font-medium">{appt.appointment_type_code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-medium text-slate-600">{appt.phone}</span>
                          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${getStatusBadgeStyles(appt.status)}`}>
                            {getStatusLabel(appt.status)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsCreateOpen(true)}
                        className="w-full text-left px-4 py-2 text-xs text-slate-400 hover:text-blue-600 border border-dashed border-transparent hover:border-blue-200 hover:bg-blue-50/30 rounded-lg transition-all"
                      >
                        + Διαθέσιμο ραντεβού
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Week Grid Implementation Component */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Week Header */}
            <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/50">
              <div className="p-3 text-center text-xs font-bold text-slate-400 border-r border-slate-100">Ώρα</div>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.name} className="p-3 text-center border-r border-slate-100 last:border-0">
                  <p className="text-xs font-bold text-slate-700">{day.name}</p>
                  <p className="text-[10px] font-medium text-slate-400">{day.date}</p>
                </div>
              ))}
            </div>
            {/* Week Matrix Grid Rows */}
            <div className="divide-y divide-slate-100">
              {TIME_SLOTS.map((time) => (
                <div key={time} className="grid grid-cols-8">
                  <div className="p-3 text-center text-xs font-bold text-slate-400 bg-slate-50/20 border-r border-slate-100 flex items-center justify-center">
                    {time}
                  </div>
                  {DAYS_OF_WEEK.map((day) => {
                    // Στο mockup, τα ραντεβού εμφανίζονται κυρίως την Παρασκευή 19/06
                    const isFriday = day.name === 'Παρασκευή';
                    const appt = isFriday ? appointments.find(a => a.start_at.includes(time)) : null;
                    return (
                      <div key={day.name} className="p-1 min-h-[60px] border-r border-slate-100 last:border-0 bg-white flex items-center">
                        {appt ? (
                          <div 
                            onClick={() => setSelectedAppointment(appt)}
                            className={`w-full p-1.5 rounded text-[10px] font-medium border cursor-pointer truncate ${
                              appt.status === 'booked' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                              appt.status === 'pending' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                              appt.status === 'cancelled' ? 'bg-rose-50 border-rose-200 text-rose-800 line-through' :
                              'bg-purple-50 border-purple-200 text-purple-800'
                            }`}
                          >
                            <div className="font-bold truncate">{appt.caller_name}</div>
                            <div className="opacity-75 truncate">{appt.appointment_type_code}</div>
                          </div>
                        ) : (
                          <div className="w-full h-full text-center text-slate-300 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer text-xs font-bold" onClick={() => setIsCreateOpen(true)}>+</div>
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

      {/* Custom Component Mounts */}
      {selectedAppointment && (
        <AppointmentDetailsPanel 
          appointment={selectedAppointment} 
          onClose={() => setSelectedAppointment(null)} 
          onStateChange={() => {}} 
        />
      )}

      {isCreateOpen && (
        <CreateAppointmentModal 
          onClose={() => setIsCreateOpen(false)} 
          onSuccess={() => setIsCreateOpen(false)} 
        />
      )}
    </div>
  );
}