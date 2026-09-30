'use client';

import React, { useState } from 'react';
import { CallbackRequest } from '@/types';
import { 
  PhoneIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  ArrowPathIcon,
  InboxIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';
import { api } from '@/services/api';

const getReasonLabel = (code?: string) => {
  const map: Record<string, string> = {
    after_hours: 'Εκτός ωραρίου λειτουργίας',
    busy: 'Γραμμή κατειλημμένη',
    appointment_request: 'Αίτημα για Ραντεβού',
    general_info: 'Γενικές Πληροφορίες',
    urgent_medical: 'Επείγον Ιατρικό Θέμα',
    failed_notification: 'Αποτυχία Ειδοποίησης',
  };
  return map[code || ''] || code || 'Αίτημα από Ψηφιακό Βοηθό';
};

export default function CallbacksPage() {
  const { isReadOnly } = useClinic();
  const { 
    callbacks, 
    loadingTab, 
    fetchCallbacks 
  } = useDashboard();
  
  const isLoading = loadingTab === 'callbacks';
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateCallback = async (callbackId: string, newStatus: 'pending' | 'completed') => {
    try {
      setIsUpdating(true);
      setError(null);

      if (api.updateCallback) {
        await api.updateCallback(callbackId, { status: newStatus });
      }

      await fetchCallbacks(true);
    } catch (err: any) {
      console.error('Error updating callback:', err);
      setError('Αποτυχία ενημέρωσης αιτήματος επανάκλησης.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getCallbackFlags = (cb: any) => {
    const rawUrgency = (cb.urgency_code || cb.urgency || '').toLowerCase();
    const isUrgent = 
      cb.is_urgent === true || 
      rawUrgency === 'high' || 
      rawUrgency === 'urgent' || 
      rawUrgency === 'emergency' || 
      cb.callback_reason_code === 'urgent_medical';

    const isUnacknowledged = !cb.acknowledged_at && cb.status !== 'completed';
    const isFailedNotification = cb.notification_status === 'failed' || cb.failed_notification === true;
    const requiresManualFollowup = isUrgent || isFailedNotification || cb.requires_manual_followup;

    return { isUrgent, isUnacknowledged, isFailedNotification, requiresManualFollowup };
  };

  const allCallbacks = callbacks || [];
  
  const emergencyCallbacks = allCallbacks.filter((cb: any) => {
    const isDone = cb.status === 'completed';
    const { isUrgent } = getCallbackFlags(cb);
    return !isDone && isUrgent;
  });

  const pendingCallbacks = allCallbacks.filter((cb: any) => {
    const isDone = cb.status === 'completed';
    const { isUrgent } = getCallbackFlags(cb);
    return !isDone && !isUrgent;
  });

  const completedCallbacks = allCallbacks.filter((cb: any) => cb.status === 'completed');

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderCallbackTable = (items: any[], title: string, isEmergencyTable = false) => {
    return (
      <div className={`bg-white dark:bg-slate-900 rounded-xl border transition-all overflow-hidden ${
        isEmergencyTable 
          ? 'border-rose-300/80 dark:border-rose-900/50 shadow-xs' 
          : 'border-slate-200 dark:border-slate-800'
      }`}>
        {/* Table Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          isEmergencyTable 
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30' 
            : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            {isEmergencyTable ? (
              <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <ClockIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            )}
            <h2 className={`font-semibold text-xs tracking-wide uppercase ${
              isEmergencyTable ? 'text-rose-900 dark:text-rose-300' : 'text-slate-700 dark:text-slate-300'
            }`}>
              {title}
            </h2>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
            isEmergencyTable
              ? 'bg-rose-100/70 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700/60'
          }`}>
            {items.length} {items.length === 1 ? 'εγγραφή' : 'εγγραφές'}
          </span>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/30 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="p-3.5 w-1/3">Καλούν / Τηλέφωνο</th>
                <th className="p-3.5 w-1/3">Αιτιολογία & Κατάσταση</th>
                <th className="p-3.5">Ημερομηνία & Ώρα</th>
                <th className="p-3.5 text-right">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {isLoading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <ArrowPathIcon className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Φόρτωση αιτημάτων...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((cb: any) => {
                  const cbId = cb.callback_id || cb.id;
                  const phone = cb.phone_normalized || cb.callback_phone_normalized || cb.phone || cb.callback_phone;
                  const reason = cb.callback_reason_code || cb.reason;
                  const isDone = cb.status === 'completed';
                  const { isUrgent, isUnacknowledged, isFailedNotification } = getCallbackFlags(cb);

                  return (
                    <tr
                      key={cbId}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                        isUrgent && !isDone ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Καλούν & Τηλέφωνο */}
                      <td className="p-3.5 align-middle">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cb.caller_name || cb.patient_name || 'Άγνωστος Καλούν'}</span>
                        </div>
                        <a
                          href={`tel:${phone}`}
                          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-mono inline-flex items-center gap-1 mt-1 text-[11px] transition-colors"
                        >
                          <PhoneIcon className="w-3 h-3 shrink-0 text-slate-400" />
                          <span>{phone || '-'}</span>
                        </a>
                      </td>

                      {/* Αιτιολογία & Badges */}
                      <td className="p-3.5 align-middle space-y-1.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {getReasonLabel(reason)}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {isUrgent && (
                            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-medium rounded border border-rose-200 dark:border-rose-900 inline-flex items-center gap-1">
                              <ExclamationTriangleIcon className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Επείγον
                            </span>
                          )}
                          {isUnacknowledged && (
                            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-medium rounded border border-amber-200 dark:border-amber-900/60 inline-flex items-center gap-1">
                              <BellAlertIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Ανεπιβεβαίωτο
                            </span>
                          )}
                          {isFailedNotification && (
                            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-medium rounded border border-amber-200 dark:border-amber-900/60 inline-flex items-center gap-1">
                              <XCircleIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Αποτυχία Ειδοποίησης
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ημερομηνία */}
                      <td className="p-3.5 align-middle text-slate-500 dark:text-slate-400">
                        <div className="inline-flex items-center gap-1.5 text-[11px]">
                          <ClockIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(cb.created_at)}</span>
                        </div>
                      </td>

                      {/* Ενέργειες */}
                      <td className="p-3.5 align-middle text-right">
                        {!isDone ? (
                          <button
                            disabled={isReadOnly || isUpdating}
                            onClick={() => handleUpdateCallback(cbId, 'completed')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium text-xs inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                          >
                            <CheckCircleIcon className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                            <span>Ολοκλήρωση</span>
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] font-medium rounded-md border border-slate-200/60 dark:border-slate-700/60">
                            Ολοκληρώθηκε
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <InboxIcon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      <span>Δεν βρέθηκαν διαθέσιμες εγγραφές.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (Responsive Cards) */}
        <div className="md:hidden p-3 divide-y divide-slate-100 dark:divide-slate-800">
          {items.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              Δεν βρέθηκαν διαθέσιμες εγγραφές.
            </div>
          ) : (
            items.map((cb: any) => {
              const cbId = cb.callback_id || cb.id;
              const phone = cb.phone_normalized || cb.callback_phone_normalized || cb.phone || cb.callback_phone;
              const reason = cb.callback_reason_code || cb.reason;
              const isDone = cb.status === 'completed';
              const { isUrgent, isUnacknowledged, isFailedNotification } = getCallbackFlags(cb);

              return (
                <div 
                  key={cbId} 
                  className={`py-3.5 first:pt-0 last:pb-0 space-y-2.5`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cb.caller_name || cb.patient_name || 'Άγνωστος Καλούν'}</span>
                      </div>
                      <a href={`tel:${phone}`} className="text-slate-600 dark:text-slate-400 text-xs font-mono flex items-center gap-1 mt-1">
                        <PhoneIcon className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{phone || '-'}</span>
                      </a>
                    </div>

                    {!isDone ? (
                      <button
                        disabled={isReadOnly || isUpdating}
                        onClick={() => handleUpdateCallback(cbId, 'completed')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-xs flex items-center gap-1 shrink-0 active:scale-95 transition-transform cursor-pointer"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                        <span>Ολοκλήρωση</span>
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-medium rounded shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                        Ολοκληρώθηκε
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {getReasonLabel(reason)}
                  </div>

                  {/* Mobile Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {isUrgent && (
                      <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-medium rounded border border-rose-200 dark:border-rose-900 inline-flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Επείγον
                      </span>
                    )}
                    {isUnacknowledged && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-medium rounded border border-amber-200 dark:border-amber-900/60 inline-flex items-center gap-1">
                        <BellAlertIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Ανεπιβεβαίωτο
                      </span>
                    )}
                    {isFailedNotification && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-medium rounded border border-amber-200 dark:border-amber-900/60 inline-flex items-center gap-1">
                        <XCircleIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Αποτυχία Ειδοποίησης
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1">
                    <ClockIcon className="w-3 h-3 shrink-0" />
                    <span>{formatDate(cb.created_at)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-900 dark:text-slate-100">
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" />
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Αιτήματα Επικοινωνίας & Επανακλήσεων
            </h1>
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-slate-400/30 border-t-slate-700 dark:border-t-slate-200 rounded-full animate-spin shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Διαχείριση εκκρεμών κλήσεων και αιτημάτων επικοινωνίας ασθενών.
          </p>
        </div>

        {/* Minimal Control Tabs (2 Tabs Only) */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg text-xs font-medium overflow-x-auto w-full sm:w-auto shrink-0 border border-slate-200/50 dark:border-slate-700/50">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Εκκρεμή ({emergencyCallbacks.length + pendingCallbacks.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Ολοκληρωμένα ({completedCallbacks.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {emergencyCallbacks.length > 0 && 
            renderCallbackTable(emergencyCallbacks, 'Επείγοντα Αιτήματα Επικοινωνίας', true)
          }
          {renderCallbackTable(pendingCallbacks, 'Εκκρεμή Αιτήματα')}
        </div>
      )}

      {/* Completed Tab */}
      {activeTab === 'completed' && renderCallbackTable(completedCallbacks, 'Ολοκληρωμένα Αιτήματα')}
    </div>
  );
}