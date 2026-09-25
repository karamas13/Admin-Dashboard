'use client';

import React, { useState } from 'react';
import { CallbackRequest } from '@/types';
import { 
  PhoneIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  BellAlertIcon
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
  return map[code || ''] || code || 'Αίτημα από AI Receptionist';
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
  
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');
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
      setError('Αποτυχία ενημέρωσης αιτήματος.');
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
      <div className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-xs overflow-hidden ${
        isEmergencyTable 
          ? 'border-rose-200 dark:border-rose-900/60' 
          : 'border-slate-200 dark:border-slate-800'
      }`}>
        <div className={`p-3.5 sm:p-4 border-b flex items-center justify-between ${
          isEmergencyTable 
            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/50' 
            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            {isEmergencyTable ? (
              <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            )}
            <h2 className={`font-bold text-xs sm:text-sm ${
              isEmergencyTable ? 'text-rose-800 dark:text-rose-200' : 'text-slate-800 dark:text-slate-100'
            }`}>
              {title} ({items.length})
            </h2>
          </div>
        </div>

        {/* Desktop / Tablet View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="p-3.5 w-1/3">Καλούν / Τηλέφωνο</th>
                <th className="p-3.5 w-1/3">Αιτιολογία & Alerts</th>
                <th className="p-3.5">Ημερομηνία</th>
                <th className="p-3.5 text-right">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 font-medium">
                    Φόρτωση...
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
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isUrgent && !isDone ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Καλούν & Τηλέφωνο */}
                      <td className="p-3.5 align-top">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{cb.caller_name || cb.patient_name || 'Άγνωστος Καλούν'}</span>
                        </div>
                        <a
                          href={`tel:${phone}`}
                          className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 mt-1 text-xs"
                        >
                          <PhoneIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{phone || '-'}</span>
                        </a>
                      </td>

                      {/* Αιτιολογία & Badges */}
                      <td className="p-3.5 align-top space-y-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {getReasonLabel(reason)}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1">
                          {isUrgent && (
                            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-bold rounded-md border border-rose-200 dark:border-rose-900 inline-flex items-center gap-1">
                              <ExclamationTriangleIcon className="w-3 h-3" /> Urgent
                            </span>
                          )}
                          {isUnacknowledged && (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded-md border border-amber-200 dark:border-amber-900 inline-flex items-center gap-1">
                              <BellAlertIcon className="w-3 h-3" /> Unacknowledged
                            </span>
                          )}
                          {isFailedNotification && (
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[10px] font-bold rounded-md border border-purple-200 dark:border-purple-900">
                              ⚠️ Failed Notification
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ημερομηνία */}
                      <td className="p-3.5 align-top text-slate-500 dark:text-slate-400 font-medium">
                        <div className="inline-flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(cb.created_at)}</span>
                        </div>
                      </td>

                      {/* Ενέργειες */}
                      <td className="p-3.5 align-top text-right">
                        {!isDone ? (
                          <button
                            disabled={isReadOnly || isUpdating}
                            onClick={() => handleUpdateCallback(cbId, 'completed')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
                          >
                            <CheckCircleIcon className="w-4 h-4 shrink-0" />
                            <span>Ολοκλήρωση</span>
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full uppercase border border-emerald-200 dark:border-emerald-900">
                            Ολοκληρώθηκε
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400 font-medium">
                    Δεν υπάρχουν εγγραφές.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View - Cards */}
        <div className="md:hidden p-3 sm:p-4 space-y-3">
          {items.map((cb: any) => {
            const cbId = cb.callback_id || cb.id;
            const phone = cb.phone_normalized || cb.callback_phone_normalized || cb.phone || cb.callback_phone;
            const reason = cb.callback_reason_code || cb.reason;
            const isDone = cb.status === 'completed';
            const { isUrgent, isUnacknowledged } = getCallbackFlags(cb);

            return (
              <div 
                key={cbId} 
                className={`p-3.5 rounded-xl border space-y-3 transition-colors ${
                  isEmergencyTable || (isUrgent && !isDone)
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {cb.caller_name || cb.patient_name || 'Άγνωστος Καλούν'}
                    </div>
                    <a href={`tel:${phone}`} className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline flex items-center gap-1 mt-0.5">
                      <PhoneIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{phone || '-'}</span>
                    </a>
                  </div>

                  {!isDone ? (
                    <button
                      disabled={isReadOnly || isUpdating}
                      onClick={() => handleUpdateCallback(cbId, 'completed')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1 shrink-0 shadow-xs"
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Ολοκλήρωση</span>
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-md shrink-0">
                      Ολοκληρώθηκε
                    </span>
                  )}
                </div>

                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                  {getReasonLabel(reason)}
                </div>

                {/* Badges στα Κινητά */}
                <div className="flex flex-wrap gap-1">
                  {isUrgent && (
                    <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 text-[10px] font-bold rounded-md border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1">
                      <ExclamationTriangleIcon className="w-3 h-3" /> Urgent
                    </span>
                  )}
                  {isUnacknowledged && (
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded-md border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                      <BellAlertIcon className="w-3 h-3" /> Unacknowledged
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <ClockIcon className="w-3 h-3 shrink-0" />
                  <span>{formatDate(cb.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Container */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
              Αιτήματα Επικοινωνίας (Callbacks & Work Items)
            </h1>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin shrink-0" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Άμεση επισκόπηση και διαχείριση εκκρεμών κλήσεων που απαιτούν επικοινωνία.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto whitespace-nowrap max-w-full">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Εκκρεμή ({emergencyCallbacks.length + pendingCallbacks.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Ολοκληρωμένα ({completedCallbacks.length})
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Όλα ({allCallbacks.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* --- DUAL TABLES FOR PENDING VIEW --- */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {/* Πίνακας 1: Επείγοντα (Emergencies) */}
          {emergencyCallbacks.length > 0 && renderCallbackTable(emergencyCallbacks, '⚠️ Επείγοντα Αιτήματα (Emergency Follow-ups)', true)}

          {/* Πίνακας 2: Τακτικά Εκκρεμή (Regular Pending) */}
          {renderCallbackTable(pendingCallbacks, 'Εκκρεμή Αιτήματα Επικοινωνίας')}
        </div>
      )}

      {/* --- COMPLETED VIEW --- */}
      {activeTab === 'completed' && renderCallbackTable(completedCallbacks, 'Ολοκληρωμένα Αιτήματα')}

      {/* --- ALL VIEW --- */}
      {activeTab === 'all' && renderCallbackTable(allCallbacks, 'Όλα τα Αιτήματα Επικοινωνίας')}
    </div>
  );
}