'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';
import CreateAppointmentModal from '@/components/create-appointment-modal';
import {
  CalendarDaysIcon,
  PhoneArrowUpRightIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

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

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DashboardHome() {
  const { selectedClinic } = useClinic();
  const { 
    appointments: contextAppointments,
    callbacks, 
    settings, 
    loadingTab, 
    fetchAppointments,
    fetchCallbacks, 
    fetchSettings 
  } = useDashboard();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch cached context data on mount / clinic switch
  useEffect(() => {
    if (selectedClinic?.id) {
      fetchAppointments();
      fetchCallbacks();
      fetchSettings();
    }
  }, [selectedClinic?.id, fetchAppointments, fetchCallbacks, fetchSettings]);

  // Derive today's appointments directly from context cache
  const todayAppointments = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    return (contextAppointments || []).filter((appt: any) => {
      if (!appt.start_at) return false;
      const apptDateStr = getLocalDateString(new Date(appt.start_at));
      return apptDateStr === todayStr;
    });
  }, [contextAppointments]);

  const isApptsLoading = loadingTab === 'appointments';

  const activeAppointments = todayAppointments.filter((a: any) => a.status !== 'cancelled');
  const cancelledAppointments = todayAppointments.filter((a: any) => a.status === 'cancelled');

  const pendingCallbacks = (callbacks || [])
    .filter((c: any) => {
      if (typeof c.is_resolved === 'boolean') return !c.is_resolved;
      if (!c.status) return true;
      const st = c.status.toLowerCase();
      return st !== 'completed' && st !== 'resolved' && st !== 'done' && st !== 'cancelled';
    })
    .sort((a: any, b: any) => {
      const aUrgent = a.urgency_code && a.urgency_code !== 'normal' ? 1 : 0;
      const bUrgent = b.urgency_code && b.urgency_code !== 'normal' ? 1 : 0;
      if (bUrgent !== aUrgent) return bUrgent - aUrgent;

      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

  const urgentCallbacks = pendingCallbacks.filter((cb: any) => {
    return cb.is_urgent || cb.urgency === 'high' || cb.urgency_code === 'high' || cb.urgency_code === 'urgent' || cb.callback_reason_code === 'urgent_medical';
  });

  const formatCallbackDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const timeStr = d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });

      if (isToday) return `Σήμερα, ${timeStr}`;

      const dateStr = d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
      return `${dateStr}, ${timeStr}`;
    } catch {
      return '';
    }
  };

  const getAppointmentLabel = (typeCode: string) => {
    if (!typeCode) return 'Γενικό';
    const settingsData = settings?.settings || settings;
    const preps = settingsData?.appointment_preparation_json || {};
    const rawPrep = preps[typeCode] || '';

    if (rawPrep.startsWith('[TITLE:')) {
      const match = rawPrep.match(/^\[TITLE:\s*(.*?)\]/);
      if (match && match[1]) return match[1];
    }

    return GREEK_LABEL_MAP[typeCode] || typeCode.replace(/_/g, ' ');
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-100 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {selectedClinic?.name ? `Ιατρείο: ${selectedClinic.name}` : 'Κέντρο Ελέγχου Ιατρείου'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ζωντανή επισκόπηση σημερινών ραντεβού και όλων των εκκρεμών αιτημάτων.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" /> Νέο Ραντεβού
          </button>        
        </div>
      </div>

      {/* Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-100 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Σημερινά Ραντεβού</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 rounded-xl">
              <CalendarDaysIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              {isApptsLoading ? '...' : activeAppointments.length}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {cancelledAppointments.length > 0 ? `${cancelledAppointments.length} ακυρωμένα` : 'Όλα ενεργά'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-100 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Εκκρεμή Callbacks</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-600/15 text-amber-600 dark:text-amber-400 rounded-xl">
              <PhoneArrowUpRightIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {loadingTab === 'callbacks' ? '...' : pendingCallbacks.length}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {pendingCallbacks.length > 0 ? 'Συνολικές εκκρεμότητες' : 'Καμία εκκρεμότητα'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-100 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Επείγοντα</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-600/15 text-rose-600 dark:text-rose-400 rounded-xl">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {loadingTab === 'callbacks' ? '...' : urgentCallbacks.length}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Υψηλής προτεραιότητας</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Schedule */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 shadow-xs p-5 sm:p-6 transition-colors">
          <div className="flex items-center justify-between border-b border-blue-50 dark:border-slate-800 pb-4 mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Πρόγραμμα Ημέρας ({todayAppointments.length})
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {new Date().toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'numeric' })}
            </span>
          </div>

          {isApptsLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Φόρτωση προγράμματος...</div>
          ) : todayAppointments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-blue-50/30 dark:bg-slate-800/40 rounded-xl border border-dashed border-blue-100 dark:border-slate-800">
              Δεν υπάρχουν προγραμματισμένα ραντεβού για σήμερα.
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayAppointments.map((appt: any) => {
                const name = appt.caller_name || appt.patient_name || appt.patient?.name || 'Ανώνυμος Ασθενής';
                const phone = appt.phone_normalized || appt.phone || '-';
                const isCancelled = appt.status === 'cancelled';
                const label = getAppointmentLabel(appt.appointment_type_code);

                return (
                  <div
                    key={appt.appointment_id || appt.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                      isCancelled
                        ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50 opacity-60'
                        : 'bg-blue-50/30 dark:bg-slate-800/50 hover:bg-blue-50/60 dark:hover:bg-slate-800 border-blue-100/60 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
                        {formatTime(appt.start_at)}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isCancelled ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          {name}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <UserIcon className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        {label}
                      </span>
                      {isCancelled ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                          Ακυρωμένο
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                          Ενεργό
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Callbacks */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-800 shadow-xs p-5 sm:p-6 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between border-b border-blue-50 dark:border-slate-800 pb-4 mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <PhoneArrowUpRightIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Όλα τα Εκκρεμή Callbacks
              </h3>
              <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                {pendingCallbacks.length}
              </span>
            </div>

            {loadingTab === 'callbacks' ? (
              <div className="py-12 text-center text-xs text-slate-400">Φόρτωση...</div>
            ) : pendingCallbacks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-blue-50/30 dark:bg-slate-800/40 rounded-xl border border-dashed border-blue-100 dark:border-slate-800">
                Δεν υπάρχουν εκκρεμή αιτήματα επανάκλησης.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-105 overflow-y-auto pr-1">
                {pendingCallbacks.map((cb: any, idx: number) => {
                  const isUrgent = cb.urgency_code && cb.urgency_code !== 'normal';
                  const dateLabel = formatCallbackDate(cb.created_at);
                  const callerName = cb.caller_name || cb.patient_name || 'Ασθενής';
                  const phoneNum = cb.phone_normalized || cb.phone || '-';

                  return (
                    <div
                      key={cb.callback_id || cb.id || idx}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isUrgent
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                          : 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/60 dark:border-amber-900/30'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {callerName}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                          {phoneNum}
                        </p>
                        {dateLabel && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{dateLabel}</p>
                        )}
                      </div>

                      {isUrgent && (
                        <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded shrink-0">
                          ΕΠΕΙΓΟΝ
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-blue-50 dark:border-slate-800 mt-4">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
              Εμφανίζονται όλα τα εκκρεμή callbacks ταξινομημένα κατά προτεραιότητα.
            </p>
          </div>
        </div>
      </div>

      {/* Modal Δημιουργίας Ραντεβού */}
      {isModalOpen && (
        <CreateAppointmentModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchAppointments(true);
            setIsModalOpen(false);      
          }}
        />
      )}
    </div>
  );
}