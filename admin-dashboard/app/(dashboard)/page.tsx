'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';
import CreateAppointmentModal from '@/components/create-appointment-modal';
import {
  CalendarIcon,
  PhoneCallIcon,
  AlertTriangleIcon,
  PlusIcon,
  UserIcon,
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ChevronRightIcon,
  RefreshCwIcon,
} from 'lucide-react';

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
    fetchSettings,
  } = useDashboard();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCallback, setSelectedCallback] = useState<any | null>(null);

  useEffect(() => {
    if (selectedClinic?.id) {
      fetchAppointments();
      fetchCallbacks();
      fetchSettings();
    }
  }, [selectedClinic?.id, fetchAppointments, fetchCallbacks, fetchSettings]);

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

  const pendingCallbacks = useMemo(() => {
    return (callbacks || [])
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
  }, [callbacks]);

  const urgentCallbacks = useMemo(() => {
    return pendingCallbacks.filter((cb: any) => {
      return (
        cb.is_urgent ||
        cb.urgency === 'high' ||
        cb.urgency_code === 'high' ||
        cb.urgency_code === 'urgent' ||
        cb.callback_reason_code === 'urgent_medical'
      );
    });
  }, [pendingCallbacks]);

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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-900 dark:text-slate-100">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {selectedClinic?.name ? selectedClinic.name : 'Κέντρο Ελέγχου'}
            </h1>
            <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Live Overview
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Διαχείριση σημερινών ραντεβού, εκκρεμών κλήσεων και αιτημάτων.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium text-xs rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" /> Νέο Ραντεβού
          </button>
        </div>
      </div>

      {/* Metric Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Σημερινά Ραντεβού
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {isApptsLoading ? '...' : activeAppointments.length}
              </span>
              <span className="text-xs text-slate-500">
                / {todayAppointments.length} συνολικά
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              {cancelledAppointments.length > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  {cancelledAppointments.length} ακυρωμένα
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Πλήρες πρόγραμμα
                </span>
              )}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Εκκρεμή Callbacks
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {loadingTab === 'callbacks' ? '...' : pendingCallbacks.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {pendingCallbacks.length > 0 ? 'Απαιτείται επικοινωνία' : 'Όλα ολοκληρώθηκαν'}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200/50 dark:border-amber-900/50">
            <PhoneCallIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Επείγοντα Αιτήματα
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {loadingTab === 'callbacks' ? '...' : urgentCallbacks.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Υψηλή προτεραιότητα
            </p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-lg border border-rose-200/50 dark:border-rose-900/50">
            <AlertTriangleIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Schedule Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-slate-500" />
                Ημερήσιο Πρόγραμμα
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {new Date().toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              {todayAppointments.length} Ραντεβού
            </span>
          </div>

          <div className="p-4 sm:p-5 flex-1">
            {isApptsLoading ? (
              <div className="py-16 text-center text-xs text-slate-400">Φόρτωση προγράμματος...</div>
            ) : todayAppointments.length === 0 ? (
              <div className="py-16 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Δεν υπάρχουν προγραμματισμένα ραντεβού για σήμερα.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayAppointments.map((appt: any) => {
                  const name = appt.caller_name || appt.patient_name || appt.patient?.name || 'Ανώνυμος Ασθενής';
                  const phone = appt.phone_normalized || appt.phone || '-';
                  const isCancelled = appt.status === 'cancelled';
                  const label = getAppointmentLabel(appt.appointment_type_code);

                  return (
                    <div
                      key={appt.appointment_id || appt.id}
                      className={`py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isCancelled ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-16 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-center">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {formatTime(appt.start_at)}
                          </span>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${isCancelled ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                            {name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-slate-400" />
                              {phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {label}
                        </span>
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                            <XCircleIcon className="w-3 h-3" /> Ακυρώθηκε
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                            <CheckCircle2Icon className="w-3 h-3" /> Επιβεβαιωμένο
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Secondary Callbacks Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PhoneCallIcon className="w-4 h-4 text-slate-500" />
              Εκκρεμότητες Callbacks
            </h2>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              {pendingCallbacks.length}
            </span>
          </div>

          <div className="p-4 sm:p-5 flex-1">
            {loadingTab === 'callbacks' ? (
              <div className="py-16 text-center text-xs text-slate-400">Φόρτωση...</div>
            ) : pendingCallbacks.length === 0 ? (
              <div className="py-12 text-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2Icon className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Καμία εκκρεμότητα επανάκλησης.
                </p>
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
                      onClick={() => setSelectedCallback(cb)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 flex items-center justify-between ${
                        isUrgent
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {callerName}
                          </p>
                          {isUrgent && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">
                              Επείγον
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          {phoneNum}
                        </p>
                        {dateLabel && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {dateLabel}
                          </p>
                        )}
                      </div>
                      <ChevronRightIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
              Ταξινόμηση βάσει προτεραιότητας & χρόνου δημιουργίας.
            </p>
          </div>
        </div>
      </div>

      {/* Callback Details Modal */}
      {selectedCallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Λεπτομέρειες Επανάκλησης
              </h3>
              <button
                onClick={() => setSelectedCallback(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold"
              >
                Κλείσιμο
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Όνομα:</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedCallback.caller_name || selectedCallback.patient_name || 'Ασθενής'}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Τηλέφωνο:</span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedCallback.phone_normalized || selectedCallback.phone || '-'}
                </p>
              </div>
              {selectedCallback.notes && (
                <div>
                  <span className="text-slate-400">Σημειώσεις:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    {selectedCallback.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedCallback(null)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Ακύρωση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Appointment Modal */}
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