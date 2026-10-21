'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PhoneIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  ArrowPathIcon,
  InboxIcon,
  XCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  XMarkIcon,
  PencilSquareIcon
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
    patient_requested_callback: 'Αίτημα Ασθενούς για Επανακλήση',
  };
  return map[code || ''] || code || 'Αίτημα από Ψηφιακό Βοηθό';
};

export default function CallbacksPage() {
  const { isReadOnly, selectedClinic, isLoading: isClinicLoading } = useClinic();
  const { 
    callbacks: cachedCallbacks, 
    fetchCallbacks,
    callbacksError 
  } = useDashboard();
  
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [localCallbacks, setLocalCallbacks] = useState<any[]>([]);

  const [selectedCallback, setSelectedCallback] = useState<any | null>(null);
  const [modalStatus, setModalStatus] = useState<string>('completed');
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isClinicLoading && selectedClinic?.id) {
      fetchCallbacks(true);
    }
  }, [selectedClinic?.id, isClinicLoading, fetchCallbacks]);

  useEffect(() => {
    if (cachedCallbacks) {
      setLocalCallbacks(cachedCallbacks);
    }
  }, [cachedCallbacks]);

  useEffect(() => {
    if (selectedCallback) {
      setModalStatus(selectedCallback.status || 'completed');
      setSuccessMsg('');
    }
  }, [selectedCallback]);

  const isCompletedStatus = (cb: any) => {
    const st = String(cb.status || '').toLowerCase();
    return st === 'completed' || st === 'resolved' || st === 'done' || st === 'closed';
  };

  const handleUpdateCallbackFull = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCallback || isSubmittingModal) return;

    const cbId = selectedCallback.callback_id || selectedCallback.id;

    try {
      setIsSubmittingModal(true);
      setError(null);
      setSuccessMsg('');

      await api.updateCallback(
        cbId,
        { status: modalStatus },
        selectedClinic?.id
      );

      setLocalCallbacks(prev => prev.map(cb => {
        const id = cb.callback_id || cb.id;
        return id === cbId ? { ...cb, status: modalStatus } : cb;
      }));

      setSuccessMsg('Η κατάσταση ενημερώθηκε με επιτυχία!');
      await fetchCallbacks(true);

      setTimeout(() => {
        setSelectedCallback(null);
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία ενημέρωσης κατάστασης.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleStatusChangeQuick = async (cb: any, newStatus: string) => {
    if (isReadOnly || updatingId) return;

    const cbId = cb.callback_id || cb.id;

    try {
      setUpdatingId(cbId);
      setError(null);
      
      await api.updateCallback(
        cbId, 
        { status: newStatus }, 
        selectedClinic?.id
      );
      
      setLocalCallbacks(prev => prev.map(item => {
        const id = item.callback_id || item.id;
        return id === cbId ? { ...item, status: newStatus } : item;
      }));

      await fetchCallbacks(true);
    } catch (err: any) {
      setError('Αποτυχία ενημέρωσης κατάστασης.');
    } finally {
      setUpdatingId(null);
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

    const isUnacknowledged = !cb.acknowledged_at && !isCompletedStatus(cb);
    const isFailedNotification = cb.notification_status === 'failed' || cb.failed_notification === true;

    return { isUrgent, isUnacknowledged, isFailedNotification };
  };

  const emergencyCallbacks = useMemo(() => {
    return (localCallbacks || []).filter((cb: any) => {
      const isDone = isCompletedStatus(cb);
      const { isUrgent } = getCallbackFlags(cb);
      return !isDone && isUrgent;
    });
  }, [localCallbacks]);

  const pendingCallbacks = useMemo(() => {
    return (localCallbacks || []).filter((cb: any) => {
      const isDone = isCompletedStatus(cb);
      const { isUrgent } = getCallbackFlags(cb);
      return !isDone && !isUrgent;
    });
  }, [localCallbacks]);

  const completedCallbacks = useMemo(() => {
    return (localCallbacks || []).filter((cb: any) => isCompletedStatus(cb));
  }, [localCallbacks]);

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

  const renderSection = (items: any[], title: string, isEmergency = false) => {
    return (
      <div className={`rounded-2xl border transition-all overflow-hidden bg-white dark:bg-[#101622] ${
        isEmergency 
          ? 'border-rose-300 dark:border-rose-900/60 shadow-md' 
          : 'border-slate-200 dark:border-slate-800 shadow-sm'
      }`}>
        <div className={`px-4 sm:px-6 py-4 border-b flex items-center justify-between ${
          isEmergency 
            ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40' 
            : 'bg-slate-50/80 dark:bg-[#0D121C] border-slate-100 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {isEmergency ? (
              <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <ClockIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
            )}
            <h2 className={`font-bold text-xs sm:text-sm uppercase tracking-wider truncate ${
              isEmergency ? 'text-rose-900 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200'
            }`}>
              {title}
            </h2>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
            isEmergency
              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-slate-700'
          }`}>
            {items.length}
          </span>
        </div>

        <div className="p-3 sm:p-6 space-y-3.5">
          {items.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <InboxIcon className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-xs sm:text-sm font-medium">Δεν βρέθηκαν διαθέσιμες εγγραφές.</p>
            </div>
          ) : (
            items.map((cb: any) => {
              const cbId = cb.callback_id || cb.id;
              const phone = cb.phone_normalized || cb.callback_phone_normalized || cb.phone || cb.callback_phone;
              const reason = cb.callback_reason_code || cb.reason;
              const isDone = isCompletedStatus(cb);
              const isItemUpdating = updatingId === cbId;
              const { isUrgent, isUnacknowledged, isFailedNotification } = getCallbackFlags(cb);
              const displayNote = cb.notes || cb.work_summary;

              return (
                <div
                  key={cbId}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col gap-3.5 ${
                    isUrgent && !isDone
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={() => setSelectedCallback(cb)}
                        className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-2 text-left cursor-pointer transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="underline decoration-dotted underline-offset-4">{cb.caller_name || cb.patient_name || 'Άγνωστος Καλούν'}</span>
                      </button>

                      <a
                        href={`tel:${phone}`}
                        className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <PhoneIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{phone || '-'}</span>
                      </a>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatDate(cb.created_at)}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {getReasonLabel(reason)}
                    </p>

                    {displayNote && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Σημείωση / Περιγραφή:</span> {displayNote}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {isUrgent && (
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 text-[11px] font-bold rounded-lg border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-3 h-3 text-rose-600" /> Επείγον
                      </span>
                    )}
                    {isUnacknowledged && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[11px] font-bold rounded-lg border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1">
                        <BellAlertIcon className="w-3 h-3 text-amber-600" /> Εκκρεμμεί
                      </span>
                    )}
                    {isFailedNotification && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[11px] font-bold rounded-lg border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1">
                        <XCircleIcon className="w-3 h-3 text-amber-600" /> Αποτυχία
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <button
                      onClick={() => setSelectedCallback(cb)}
                      className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all shadow-xs cursor-pointer"
                    >
                      <PencilSquareIcon className="w-4 h-4 text-emerald-600" />
                      <span>Προβολή & Κατάσταση</span>
                    </button>

                    {!isDone ? (
                      <button
                        disabled={isReadOnly || isItemUpdating}
                        onClick={() => handleStatusChangeQuick(cb, 'completed')}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-sm cursor-pointer"
                      >
                        {isItemUpdating ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircleIcon className="w-4 h-4 shrink-0" />
                        )}
                        <span>Ολοκλήρωση</span>
                      </button>
                    ) : (
                      <button
                        disabled={isReadOnly || isItemUpdating}
                        onClick={() => handleStatusChangeQuick(cb, 'pending')}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        {isItemUpdating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <span>Επαναφορά σε Εκκρεμές</span>}
                      </button>
                    )}
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-slate-900 dark:text-slate-100 font-sans">
      
      <div className="bg-white dark:bg-[#101622] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <PhoneIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Αιτήματα Επικοινωνίας & Επανακλήσεων
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Διαχείριση εκκρεμών κλήσεων και αιτημάτων επικοινωνίας για την κλινική{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{selectedClinic?.name}</span>.
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-semibold shrink-0 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-[#101622] text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Εκκρεμή ({emergencyCallbacks.length + pendingCallbacks.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-[#101622] text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Ολοκληρωμένα ({completedCallbacks.length})
          </button>
        </div>
      </div>

      {(error || callbacksError) && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-2xl flex items-center gap-2 font-semibold">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
          <span>{error || callbacksError}</span>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-6">
          {emergencyCallbacks.length > 0 && 
            renderSection(emergencyCallbacks, 'Επείγοντα Αιτήματα Επικοινωνίας', true)
          }
          {renderSection(pendingCallbacks, 'Εκκρεμή Αιτήματα')}
        </div>
      )}

      {activeTab === 'completed' && renderSection(completedCallbacks, 'Ολοκληρωμένα Αιτήματα')}

      {selectedCallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#101622] rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0D121C]">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-emerald-600" />
                  <span>Διαχείριση: {selectedCallback.caller_name || selectedCallback.patient_name || 'Ασθενής'}</span>
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-1 flex items-center gap-1.5">
                  <PhoneIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{selectedCallback.phone_normalized || selectedCallback.phone}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedCallback(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {successMsg && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                <CheckCircleIcon className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCallbackFull} className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
              
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Σημειώσεις / Περιγραφή Εργασίας (Από AI Assistant)
                </label>
                <div className="w-full p-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 min-h-[80px] whitespace-pre-wrap">
                  {selectedCallback.notes || selectedCallback.work_summary || 'Δεν υπάρχουν διαθέσιμες σημειώσεις.'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Κατάσταση Αιτήματος (Status)
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="w-full h-11 px-3.5 text-xs font-medium rounded-2xl bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="pending">Σε εκκρεμότητα (Pending)</option>
                  <option value="in_progress">Σε εξέλιξη (In Progress)</option>
                  <option value="completed">Ολοκληρώθηκε (Completed)</option>
                  <option value="resolved">Επιλύθηκε (Resolved)</option>
                  <option value="cancelled">Ακυρώθηκε (Cancelled)</option>
                </select>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCallback(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-sm cursor-pointer"
                >
                  {isSubmittingModal && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                  <span>Αποθήκευση Κατάστασης</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}