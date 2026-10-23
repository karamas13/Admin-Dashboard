'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  PhoneIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  BellAlertIcon,
  ArrowPathIcon,
  InboxIcon,
  XCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  XMarkIcon,
  PencilSquareIcon,
  DocumentTextIcon
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
    water_leak: 'Διαρροή Νερού',
    repair: 'Επισκευή',
    customer_requested_callback: 'Αίτημα Πελάτη για Επανακλήση'
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

  // States for Staff Notes Modal
  const [selectedCallback, setSelectedCallback] = useState<any | null>(null);
  const [modalStaffNotes, setModalStaffNotes] = useState<string>('');
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
      setModalStaffNotes(selectedCallback.staff_notes || '');
      setSuccessMsg('');
    }
  }, [selectedCallback]);

  const isCompletedStatus = (cb: any) => {
    const st = String(cb.status || '').toLowerCase();
    return st === 'completed' || st === 'resolved' || st === 'done' || st === 'closed';
  };

  // Save Staff Notes via Modal
  const handleSaveStaffNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCallback || isSubmittingModal) return;

    const cbId = selectedCallback.callback_id || selectedCallback.id;

    try {
      setIsSubmittingModal(true);
      setError(null);
      setSuccessMsg('');

      const payload = {
        notes: modalStaffNotes
      };

      await api.updateCallback(cbId, payload, selectedClinic?.id);

      setLocalCallbacks(prev => prev.map(cb => {
        const id = cb.callback_id || cb.id;
        return id === cbId ? { ...cb, staff_notes: modalStaffNotes } : cb;
      }));

      setSuccessMsg('Οι σημειώσεις αποθηκεύτηκαν με επιτυχία!');
      await fetchCallbacks(true);

      setTimeout(() => {
        setSelectedCallback(null);
      }, 600);
    } catch (err: any) {
      setError(err?.message || 'Αποτυχία αποθήκευσης σημειώσεων.');
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Quick status change / Revert to pending or completed
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
      cb.callback_reason_code === 'urgent_medical' ||
      cb.callback_reason_code === 'water_leak' ||
      cb.callback_reason_code === 'repair';

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
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderSection = (items: any[], title: string, isEmergency = false) => {
    return (
      <div className={`rounded-2xl border overflow-hidden bg-white dark:bg-[#101622] ${
        isEmergency 
          ? 'border-rose-300 dark:border-rose-900/60 shadow-xs' 
          : 'border-slate-200 dark:border-slate-800 shadow-xs'
      }`}>
        <div className={`px-3 sm:px-4 py-3 border-b flex items-center justify-between gap-3 ${
          isEmergency 
            ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40' 
            : 'bg-slate-50/80 dark:bg-[#0D121C] border-slate-100 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {isEmergency ? (
              <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <ClockIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            )}
            <h2 className={`font-bold text-xs uppercase tracking-wider truncate ${
              isEmergency ? 'text-rose-900 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200'
            }`}>
              {title}
            </h2>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
            isEmergency
              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-slate-700'
          }`}>
            {items.length}
          </span>
        </div>

        <div className="p-2.5 sm:p-4 space-y-2.5 sm:space-y-3">
          {items.length === 0 ? (
            <div className="py-6 text-center text-slate-400 dark:text-slate-500 space-y-1">
              <InboxIcon className="w-6 h-6 mx-auto opacity-50" />
              <p className="text-xs font-medium">Δεν βρέθηκαν διαθέσιμες εγγραφές.</p>
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
              const staffNotes = cb.staff_notes;

              return (
                <div
                  key={cbId}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col gap-2.5 ${
                    isUrgent && !isDone
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300'
                  }`}
                >
                  {/* Primary Info Row: Caller Name (Large), Phone (Quick Call), Date */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                      <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight truncate">
                        {cb.caller_name || cb.patient_name || 'Άγνωστος Καλούν'}
                      </span>

                      <a
                        href={`tel:${phone}`}
                        className="text-xs sm:text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60 inline-flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <PhoneIcon className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span>{phone || '-'}</span>
                      </a>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3 shrink-0" />
                        <span>{formatDate(cb.created_at)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Secondary Details: Reason, Badges & Actions Inline */}
                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {getReasonLabel(reason)}
                        </span>

                        {isUrgent && (
                          <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 text-[10px] font-bold rounded-md border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1 shrink-0">
                            <ExclamationTriangleIcon className="w-3 h-3 text-rose-600" /> Επείγον
                          </span>
                        )}
                        {isUnacknowledged && (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[10px] font-bold rounded-md border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1 shrink-0">
                            <BellAlertIcon className="w-3 h-3 text-amber-600" /> Εκκρεμμεί
                          </span>
                        )}
                        {isFailedNotification && (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[10px] font-bold rounded-md border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1 shrink-0">
                            <XCircleIcon className="w-3 h-3 text-amber-600" /> Αποτυχία
                          </span>
                        )}
                      </div>

                      {/* Actions inline */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedCallback(cb)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Σημειώσεις</span>
                        </button>

                        {!isDone ? (
                          <button
                            disabled={isReadOnly || isItemUpdating}
                            onClick={() => handleStatusChangeQuick(cb, 'completed')}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                          >
                            {isItemUpdating ? (
                              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin shrink-0" />
                            ) : (
                              <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>Ολοκλήρωση</span>
                          </button>
                        ) : (
                          <button
                            disabled={isReadOnly || isItemUpdating}
                            onClick={() => handleStatusChangeQuick(cb, 'pending')}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                          >
                            {isItemUpdating ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin shrink-0" /> : <span>Επαναφορά</span>}
                          </button>
                        )}
                      </div>
                    </div>

                    {displayNote && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 break-words leading-relaxed">
                        <span className="font-bold text-slate-800 dark:text-slate-200">AI Σημείωση:</span> {displayNote}
                      </p>
                    )}

                    {staffNotes && (
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 break-words leading-relaxed">
                        <span className="font-bold">Σημείωση Προσωπικού:</span> {staffNotes}
                      </p>
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
    <div className="space-y-4 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 min-h-dvh text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-[#101622] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
              Αιτήματα Επικοινωνίας & Επανακλήσεων
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            Διαχείριση εκκρεμών κλήσεων για την κλινική{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClinic?.name}</span>.
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold shrink-0 border border-slate-200 dark:border-slate-700 w-full lg:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 lg:flex-none px-3 sm:px-4 py-2.5 rounded-lg transition-all cursor-pointer text-center truncate min-w-0 ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-[#101622] text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Εκκρεμή ({emergencyCallbacks.length + pendingCallbacks.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 lg:flex-none px-3 sm:px-4 py-2.5 rounded-lg transition-all cursor-pointer text-center truncate min-w-0 ${
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
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2 font-semibold">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
          <span>{error || callbacksError}</span>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="space-y-4">
          {emergencyCallbacks.length > 0 && 
            renderSection(emergencyCallbacks, 'Επείγοντα Αιτήματα', true)
          }
          {renderSection(pendingCallbacks, 'Εκκρεμή Αιτήματα')}
        </div>
      )}

      {activeTab === 'completed' && renderSection(completedCallbacks, 'Ολοκληρωμένα Αιτήματα')}

      {/* MINIMAL STAFF NOTES MODAL */}
      {selectedCallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] my-auto">
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0D121C]">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                  <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{selectedCallback.caller_name || selectedCallback.patient_name || 'Ασθενής'}</span>
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                  <PhoneIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{selectedCallback.phone_normalized || selectedCallback.phone}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedCallback(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            {successMsg && (
              <div className="mx-4 mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
                <CheckCircleIcon className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaffNotes} className="p-4 flex-1 overflow-y-auto space-y-3">
              
              {/* Read-Only AI Work Summary / Notes */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Περιγραφή από AI Assistant
                </label>
                <div className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                  {selectedCallback.notes || selectedCallback.work_summary || 'Δεν υπάρχουν διαθέσιμες σημειώσεις.'}
                </div>
              </div>

              {/* Editable Staff Notes Field (`staff_notes`) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <DocumentTextIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Σημειώσεις Προσωπικού</span>
                </label>
                <textarea
                  value={modalStaffNotes}
                  onChange={(e) => setModalStaffNotes(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder="Προσθέστε σχόλια ή ενέργειες προσωπικού..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCallback(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 transition-all shadow-xs cursor-pointer"
                >
                  {isSubmittingModal && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin shrink-0" />}
                  <span>Αποθήκευση</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}