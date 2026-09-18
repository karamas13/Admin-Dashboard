'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/services/api';
import { CallbackRequest } from '@/types';
import { 
  PhoneIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  BellAlertIcon,
  PencilSquareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useClinic } from '@/context/ClinicContext';

// Helper για μετάφραση του callback_reason_code
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
  const { selectedClinic, isReadOnly } = useClinic();
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tabs: 'pending', 'urgent', 'completed', 'all'
  const [activeTab, setActiveTab] = useState<'pending' | 'urgent' | 'completed' | 'all'>('pending');

  // Selected Callback for Modal/Drawer
  const [activeCallback, setActiveCallback] = useState<CallbackRequest | null>(null);
  const [staffNote, setStaffNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Φόρτωση Callbacks
  const loadCallbacks = useCallback(async () => {
    if (!selectedClinic?.id) return;
    try {
      setIsLoading(true);
      setError('');
      
      const data = await api.getCallbacks(undefined, selectedClinic.id);

      if (data && data.success) {
        setCallbacks(data.callbacks || []);
      } else if (Array.isArray(data)) {
        setCallbacks(data);
      } else {
        setCallbacks([]);
      }
    } catch (err: any) {
      console.error('Σφάλμα κατά τη φόρτωση των callbacks:', err);
      setError('Αποτυχία φόρτωσης αιτημάτων επικοινωνίας.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClinic?.id]);

  useEffect(() => {
    loadCallbacks();
  }, [loadCallbacks]);

  
  // Ενημέρωση/Ολοκλήρωση Callback
  const handleUpdateCallback = async (callbackId: string, newStatus: 'pending' | 'completed', notes?: string) => {
    try {
      setIsUpdating(true);
      await api.updateCallback(callbackId, { status: newStatus, notes }, selectedClinic?.id);
      
      // Update local state
      setCallbacks(prev => prev.map(cb => {
        if ((cb.callback_id || (cb as any).id) === callbackId) {
          return { ...cb, status: newStatus, notes: notes ?? (cb as any).notes };
        }
        return cb;
      }));

      if (activeCallback && (activeCallback.callback_id || (activeCallback as any).id) === callbackId) {
        setActiveCallback(null);
      }
    } catch (err: any) {
      console.error('Error updating callback:', err);
      alert('Αποτυχία ενημέρωσης αιτήματος.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper Επισήμανσης Κατάστασης & Alerts
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

  // Φιλτράρισμα βάσει Tab
  const filteredCallbacks = callbacks.filter((cb: any) => {
    const isDone = cb.status === 'completed';
    const { isUrgent } = getCallbackFlags(cb);

    if (activeTab === 'pending') return !isDone;
    if (activeTab === 'urgent') return !isDone && isUrgent;
    if (activeTab === 'completed') return isDone;
    return true; // 'all'
  });

  const urgentCount = callbacks.filter((c: any) => c.status !== 'completed' && getCallbackFlags(c).isUrgent).length;
  const pendingCount = callbacks.filter((c: any) => c.status !== 'completed').length;
  const completedCount = callbacks.filter((c: any) => c.status === 'completed').length;

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Container */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Αιτήματα Επικοινωνίας (Work Items)
            </h1>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Επισκόπηση και επεξεργασία κλήσεων που απαιτούν follow-up από το προσωπικό.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold self-start md:self-auto flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Εκκρεμή ({pendingCount})
          </button>

          <button
            onClick={() => setActiveTab('urgent')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              activeTab === 'urgent'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
            }`}
          >
            <ExclamationTriangleIcon className="w-3.5 h-3.5" />
            Επείγοντα ({urgentCount})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Ολοκληρωμένα ({completedCount})
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Όλα ({callbacks.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main Work Items List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="p-3.5">Καλούν / Τηλέφωνο</th>
                <th className="p-3.5">Αιτιολογία & Alerts</th>
                <th className="p-3.5">Ημερομηνία</th>
                <th className="p-3.5">Κατάσταση</th>
                <th className="p-3.5 text-right">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500">
                    Φόρτωση αιτημάτων επικοινωνίας...
                  </td>
                </tr>
              ) : filteredCallbacks.length > 0 ? (
                filteredCallbacks.map((cb: any) => {
                  const cbId = cb.callback_id || cb.id;
                  const phone = cb.phone_normalized || cb.callback_phone_normalized || cb.phone || cb.callback_phone;
                  const reason = cb.callback_reason_code || cb.reason;
                  const isDone = cb.status === 'completed';
                  const { isUrgent, isUnacknowledged, isFailedNotification } = getCallbackFlags(cb);

                  return (
                    <tr
                      key={cbId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isUrgent && !isDone ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Patient & Phone */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          {cb.caller_name || cb.patient_name || 'Άγνωστος Καλούν'}
                        </div>
                        <a
                          href={`tel:${phone}`}
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <PhoneIcon className="w-3 h-3" />
                          {phone || '-'}
                        </a>
                      </td>

                      {/* Reason & Highlights */}
                      <td className="p-3.5 space-y-1">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {getReasonLabel(reason)}
                        </div>
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

                      {/* Date */}
                      <td className="p-3.5 text-slate-500 dark:text-slate-400 font-medium">
                        <div className="inline-flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          {formatDate(cb.created_at)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase border ${
                            isDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                              : isUrgent
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                          }`}
                        >
                          {isDone ? 'Ολοκληρώθηκε' : isUrgent ? 'Επείγον' : 'Εκκρεμεί'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setActiveCallback(cb);
                            setStaffNote(cb.notes || '');
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold inline-flex items-center gap-1"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                          Προβολή / Edit
                        </button>

                        {!isDone && (
                          <button
                            disabled={isReadOnly}
                            onClick={() => handleUpdateCallback(cbId, 'completed')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Δεν βρέθηκαν αιτήματα επικοινωνίας.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ACTION MODAL / DRAWER FOR EDITING & COMPLETING CALLBACK --- */}
      {activeCallback && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <PhoneIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Επεξεργασία Work Item
              </h3>
              <button
                onClick={() => setActiveCallback(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-slate-700 dark:text-slate-300">
                <p><span className="font-semibold text-slate-700 dark:text-slate-300">Καλούν:</span> {(activeCallback as any).caller_name || (activeCallback as any).patient_name || 'Άγνωστος'}</p>
                <p>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Τηλέφωνο:</span>{' '}
                  <a href={`tel:${(activeCallback as any).phone || (activeCallback as any).phone_normalized}`} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                    {(activeCallback as any).phone || (activeCallback as any).phone_normalized}
                  </a>
                </p>
                <p><span className="font-semibold text-slate-700 dark:text-slate-300">Λόγος:</span> {getReasonLabel((activeCallback as any).callback_reason_code || (activeCallback as any).reason)}</p>
                <p><span className="font-semibold text-slate-700 dark:text-slate-300">Ημερομηνία:</span> {formatDate((activeCallback as any).created_at)}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Σημειώσεις Προσωπικού (Staff Follow-Up Notes)
                </label>
                <textarea
                  rows={3}
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                  placeholder="Προσθέστε σημειώσεις σχετικά με την επικοινωνία με τον ασθενή..."
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t dark:border-slate-800">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() =>
                    handleUpdateCallback(
                      activeCallback.callback_id || (activeCallback as any).id,
                      (activeCallback as any).status || 'pending',
                      staffNote
                    )
                  }
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  Αποθήκευση Σημείωσης
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCallback(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Ακύρωση
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating || isReadOnly}
                    onClick={() =>
                      handleUpdateCallback(
                        activeCallback.callback_id || (activeCallback as any).id,
                        'completed',
                        staffNote
                      )
                    }
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm flex items-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Ολοκλήρωση
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}