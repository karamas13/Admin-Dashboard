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
  PaperAirplaneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';

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
  const { isReadOnly, selectedClinic, isLoading: isClinicLoading } = useClinic();
  const { 
    callbacks: cachedCallbacks, 
    fetchCallbacks,
    updateCallback,
    addCallbackNote,
    callbacksError 
  } = useDashboard();
  
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // States for Callback Notes / Comments Drawer
  const [selectedCallback, setSelectedCallback] = useState<any | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  useEffect(() => {
    if (!isClinicLoading && selectedClinic?.id) {
      fetchCallbacks();
    }
  }, [selectedClinic?.id, isClinicLoading, fetchCallbacks]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || isSubmittingNote || !selectedCallback) return;

    const cbId = selectedCallback.callback_id || selectedCallback.id;

    try {
      setIsSubmittingNote(true);
      setError(null);
      await addCallbackNote(cbId, newNoteContent.trim());
      
      // Update local drawer view immediately
      setSelectedCallback((prev: any) => ({
        ...prev,
        notes: newNoteContent.trim()
      }));
      setNewNoteContent('');
    } catch (err: any) {
      console.error('Error adding note:', err);
      setError('Αποτυχία προσθήκης σχολίου.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleStatusChange = async (callbackId: string, newStatus: 'pending' | 'completed') => {
    if (isReadOnly || updatingId) return;

    try {
      setUpdatingId(callbackId);
      setError(null);
      await updateCallback(callbackId, newStatus);
    } catch (err: any) {
      console.error('Error updating callback:', err);
      setError('Αποτυχία ενημέρωσης κατάστασης αιτήματος.');
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

    const isUnacknowledged = !cb.acknowledged_at && cb.status !== 'completed';
    const isFailedNotification = cb.notification_status === 'failed' || cb.failed_notification === true;

    return { isUrgent, isUnacknowledged, isFailedNotification };
  };

  const emergencyCallbacks = useMemo(() => {
    return (cachedCallbacks || []).filter((cb: any) => {
      const isDone = cb.status === 'completed';
      const { isUrgent } = getCallbackFlags(cb);
      return !isDone && isUrgent;
    });
  }, [cachedCallbacks]);

  const pendingCallbacks = useMemo(() => {
    return (cachedCallbacks || []).filter((cb: any) => {
      const isDone = cb.status === 'completed';
      const { isUrgent } = getCallbackFlags(cb);
      return !isDone && !isUrgent;
    });
  }, [cachedCallbacks]);

  const completedCallbacks = useMemo(() => {
    return (cachedCallbacks || []).filter((cb: any) => cb.status === 'completed');
  }, [cachedCallbacks]);

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
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isEmergency 
            ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40' 
            : 'bg-slate-50/80 dark:bg-[#0D121C] border-slate-100 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {isEmergency ? (
              <ExclamationTriangleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <ClockIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
            )}
            <h2 className={`font-bold text-sm uppercase tracking-wider ${
              isEmergency ? 'text-rose-900 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200'
            }`}>
              {title}
            </h2>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            isEmergency
              ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
              : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-slate-700'
          }`}>
            {items.length} {items.length === 1 ? 'Εγγραφή' : 'Εγγραφές'} 
          </span>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <InboxIcon className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-sm font-medium">Δεν βρέθηκαν διαθέσιμες εγγραφές.</p>
            </div>
          ) : (
            items.map((cb: any) => {
              const cbId = cb.callback_id || cb.id;
              const phone = cb.phone_normalized || cb.callback_phone_normalized || cb.phone || cb.callback_phone;
              const reason = cb.callback_reason_code || cb.reason;
              const isDone = cb.status === 'completed';
              const isItemUpdating = updatingId === cbId;
              const { isUrgent, isUnacknowledged, isFailedNotification } = getCallbackFlags(cb);

              return (
                <div
                  key={cbId}
                  className={`p-5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                    isUrgent && !isDone
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button 
                        onClick={() => setSelectedCallback(cb)}
                        className="font-bold text-base text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-2 text-left cursor-pointer transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="underline decoration-dotted underline-offset-4">{cb.caller_name || cb.patient_name || 'Άγνωστος Καλούν'}</span>
                      </button>

                      <a
                        href={`tel:${phone}`}
                        className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <PhoneIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{phone || '-'}</span>
                      </a>
                    </div>

                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {getReasonLabel(reason)}
                    </p>

                    {cb.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Σημείωση:</span> {cb.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {isUrgent && (
                        <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-bold rounded-md border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1.5">
                          <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Επείγον
                        </span>
                      )}
                      {isUnacknowledged && (
                        <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-md border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1.5">
                          <BellAlertIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Ανεπιβεβαίωτο
                        </span>
                      )}
                      {isFailedNotification && (
                        <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-md border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1.5">
                          <XCircleIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Αποτυχία Ειδοποίησης
                        </span>
                      )}
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1 ml-auto md:ml-0">
                        <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatDate(cb.created_at)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setSelectedCallback(cb)}
                      className="flex-1 md:flex-initial px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all shadow-xs cursor-pointer"
                    >
                      <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-emerald-600" />
                      <span>Σχόλια</span>
                    </button>

                    {!isDone ? (
                      <button
                        disabled={isReadOnly || isItemUpdating}
                        onClick={() => handleStatusChange(cbId, 'completed')}
                        className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-sm cursor-pointer"
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
                        onClick={() => handleStatusChange(cbId, 'pending')}
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-900 dark:text-slate-100 font-sans">
      
      <div className="bg-white dark:bg-[#101622] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <PhoneIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Αιτήματα Επικοινωνίας & Επανακλήσεων
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Διαχείριση εκκρεμών κλήσεων και αιτημάτων επικοινωνίας για την κλινική{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{selectedClinic?.name}</span>.
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl text-xs font-semibold shrink-0 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-[#101622] text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Εκκρεμή ({emergencyCallbacks.length + pendingCallbacks.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg transition-all cursor-pointer ${
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
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2 font-semibold">
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

      {/* Callback Notes & Comments Modal Drawer */}
      {selectedCallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0D121C]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ChatBubbleBottomCenterTextIcon className="w-5 h-5 text-emerald-600" />
                  <span>Σχόλια & Σημειώσεις: {selectedCallback.caller_name || 'Ασθενής'}</span>
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

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {!selectedCallback.notes ? (
                <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                  <p className="font-semibold">Δεν υπάρχουν καταγεγραμμένα σχόλια για αυτό το αίτημα.</p>
                  <p>Χρησιμοποιήστε την παρακάτω φόρμα για να προσθέσετε σημείωση.</p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Σημείωση Αιτήματος
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedCallback.notes}
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleAddNote} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0D121C] flex gap-3">
              <input 
                type="text"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Προσθήκη ή ενημέρωση σημείωσης..."
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-slate-100 shadow-xs"
              />
              <button 
                type="submit"
                disabled={!newNoteContent.trim() || isSubmittingNote}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 disabled:opacity-40 transition-all shadow-sm cursor-pointer shrink-0"
              >
                {isSubmittingNote ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="w-4 h-4" />
                )}
                <span>Αποθήκευση</span>
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}