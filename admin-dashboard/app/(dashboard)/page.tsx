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
  const { selectedClinic, isLoading: isClinicLoading } = useClinic();
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

  // Υποστήριξη κλεισίματος με το πλήκτρο Escape για το modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCallback(null);
      }
    };
    if (selectedCallback) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCallback]);

  // Clean, single trigger for fetching dashboard data on clinic load/change
  useEffect(() => {
    if (!isClinicLoading && selectedClinic?.id) {
      fetchAppointments();
      fetchCallbacks();
      fetchSettings();
    }
  }, [selectedClinic?.id, isClinicLoading, fetchAppointments, fetchCallbacks, fetchSettings]);

  const todayAppointments = useMemo(() => {
    const todayStr = getLocalDateString(new Date());
    return (contextAppointments || []).filter((appt: any) => {
      if (!appt.start_at) return false;
      const apptDateStr = getLocalDateString(new Date(appt.start_at));
      return apptDateStr === todayStr;
    });
  }, [contextAppointments]);

  const isApptsLoading = isClinicLoading || loadingTab === 'appointments';
  const isCallbacksLoading = isClinicLoading || loadingTab === 'callbacks';

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
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 min-h-dvh text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500/30">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {selectedClinic?.name ? selectedClinic.name : 'Κέντρο Ελέγχου'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Διαχείριση σημερινών ραντεβού, εκκρεμών κλήσεων και αιτημάτων.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" /> <span>Νέο Ραντεβού</span>
          </button>
        </div>
      </div>

      {/* Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        <div className="p-4 sm:p-5 bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Σημερινά Ραντεβού
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {isApptsLoading ? '...' : activeAppointments.length}
              </span>
              <span className="text-xs font-medium text-slate-500">
                / {todayAppointments.length} συνολικά
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
              {cancelledAppointments.length > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {cancelledAppointments.length} ακυρωμένα
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Πλήρες πρόγραμμα
                </span>
              )}
            </p>
          </div>
          <div className="p-3 sm:p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Εκκρεμή Callbacks
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                {isCallbacksLoading ? '...' : pendingCallbacks.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {pendingCallbacks.length > 0 ? 'Απαιτείται επικοινωνία' : 'Όλα ολοκληρώθηκαν'}
            </p>
          </div>
          <div className="p-3 sm:p-3.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-2xl border border-amber-200 dark:border-amber-900/50 shrink-0">
            <PhoneCallIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Επείγοντα Αιτήματα
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                {isCallbacksLoading ? '...' : urgentCallbacks.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">
              Υψηλή προτεραιότητα
            </p>
          </div>
          <div className="p-3 sm:p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-2xl border border-rose-200 dark:border-rose-900/50 shrink-0">
            <AlertTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Primary Schedule Section */}
        <div className="lg:col-span-2 bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#0D121C] rounded-t-2xl">
            <div className="min-w-0 pr-2">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                <ClockIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Ημερήσιο Πρόγραμμα</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {new Date().toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span className="inline-flex items-center rounded-xl bg-slate-200/70 dark:bg-slate-800 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 shrink-0">
              {todayAppointments.length} Ραντεβού
            </span>
          </div>

          <div className="p-3 sm:p-5 flex-1">
            {isApptsLoading ? (
              <div className="py-16 text-center text-xs text-slate-400 font-medium">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCwIcon className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Φόρτωση προγράμματος...</span>
                </div>
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
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
                      className={`py-3.5 sm:py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isCancelled ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 sm:w-20 py-1.5 sm:py-2 bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 rounded-xl text-center font-mono shrink-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {formatTime(appt.start_at)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs sm:text-sm font-bold truncate ${isCancelled ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                            {name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 truncate">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{phone}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-0 border-slate-100 dark:border-slate-800/80 pt-2 sm:pt-0">
                        <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate">
                          {label}
                        </span>
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 shrink-0">
                            <XCircleIcon className="w-3.5 h-3.5" /> Ακυρώθηκε
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 shrink-0">
                            <CheckCircle2Icon className="w-3.5 h-3.5" /> Επιβεβαιωμένο
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
        <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-[#0D121C] rounded-t-2xl">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PhoneCallIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Εκκρεμότητες Callbacks</span>
            </h2>
            <span className="text-[11px] sm:text-xs bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0">
              {pendingCallbacks.length}
            </span>
          </div>

          <div className="p-3 sm:p-5 flex-1">
            {isCallbacksLoading ? (
              <div className="py-16 text-center text-xs text-slate-400 font-medium">
                <div className="flex items-center justify-center gap-2">
                  <RefreshCwIcon className="w-4 h-4 animate-spin text-emerald-500" />
                  <span>Φόρτωση...</span>
                </div>
              </div>
            ) : pendingCallbacks.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
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
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between ${
                        isUrgent
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                          : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {callerName}
                          </p>
                          {isUrgent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                              Επείγον
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-1 truncate">
                          {phoneNum}
                        </p>
                        {dateLabel && (
                          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate">
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
        </div>
      </div>

      {/* Callback Details Modal */}
      {selectedCallback && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto" 
          role="dialog" 
          aria-modal="true"
          onClick={() => setSelectedCallback(null)}
        >
          <div 
            className="bg-white dark:bg-[#101622] rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                Λεπτομέρειες Επανάκλησης
              </h3>
              <button
                onClick={() => setSelectedCallback(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Κλείσιμο"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <span className="text-slate-400 font-medium text-xs">Όνομα:</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {selectedCallback.caller_name || selectedCallback.patient_name || 'Ασθενής'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium text-xs">Τηλέφωνο:</span>
                <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedCallback.phone_normalized || selectedCallback.phone || '-'}
                </p>
              </div>
              {selectedCallback.notes && (
                <div>
                  <span className="text-slate-400 font-medium text-xs">Σημειώσεις:</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-1 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs leading-relaxed wrap-break-word">
                    {selectedCallback.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedCallback(null)}
                className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
              >
                Κλείσιμο
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
            fetchAppointments();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}