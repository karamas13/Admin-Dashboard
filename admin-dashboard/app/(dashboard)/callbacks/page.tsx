'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/services/api';
import { CallbackRequest } from '@/types';
import { 
  PhoneIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  UserIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline';

const CLINIC_ID = process.env.NEXT_PUBLIC_SUPABASE_CLINIC_ID;

// Helper για φιλική μετάφραση του callback_reason_code
const getReasonLabel = (code?: string) => {
  const map: Record<string, string> = {
    after_hours: 'Εκτός ωραρίου λειτουργίας',
    busy: 'Γραμμή κατειλημμένη',
    appointment_request: 'Αίτημα για Ραντεβού',
    general_info: 'Γενικές Πληροφορίες',
  };
  return map[code || ''] || code || 'Αίτημα από AI Receptionist';
};

export default function CallbacksPage() {
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tabs: 'pending' (Created/Pending), 'completed', 'all'
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');

  // Φόρτωση Callbacks
  const loadCallbacks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Καλούμε το API χωρίς αυστηρό φίλτρο status για να τα φέρουμε όλα
      const data = await api.getCallbacks(undefined, CLINIC_ID);

      if (data && data.success) {
        setCallbacks(data.callbacks || []);
      } else if (Array.isArray(data)) {
        setCallbacks(data);
      }
    } catch (err: any) {
      console.error('Σφάλμα κατά τη φόρτωση των callbacks:', err);
      setError('Αποτυχία φόρτωσης αιτημάτων επικοινωνίας.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCallbacks();
  }, [loadCallbacks]);

  // Τοπικό Μαρκάρισμα ως Ολοκληρωμένο
  const handleMarkAsCompleted = (callbackId: string) => {
    setCompletedIds((prev) => new Set(prev).add(callbackId));
  };

  // Φιλτράρισμα βάσει του ενεργού Tab
  const filteredCallbacks = callbacks.filter((cb) => {
    const isDone = completedIds.has(cb.callback_id);
    if (activeTab === 'pending') return !isDone;
    if (activeTab === 'completed') return isDone;
    return true; // 'all'
  });

  // Helper μορφοποίησης ημερομηνίας
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
    <div className="space-y-6">
      {/* Header Container */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              Αιτήματα Επικοινωνίας (Callbacks)
            </h2>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Διαχειριστείτε τις κλήσεις που ζήτησαν οι ασθενείς μέσω της AI Receptionist.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'pending'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Εκκρεμή ({callbacks.filter((c) => !completedIds.has(c.callback_id)).length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'completed'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ολοκληρωμένα ({completedIds.size})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Όλα ({callbacks.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Mobile View (Cards) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-slate-400">Φόρτωση αιτημάτων...</div>
          ) : filteredCallbacks.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              {activeTab === 'pending'
                ? 'Όλα τα αιτήματα επικοινωνίας έχουν διεκπεραιωθεί!'
                : 'Δεν βρέθηκαν αιτήματα.'}
            </div>
          ) : (
            filteredCallbacks.map((cb) => {
              const phone = (cb as any).phone_normalized || (cb as any).callback_phone_normalized || cb.phone;
              const reason = (cb as any).callback_reason_code || (cb as any).reason;
              const isDone = completedIds.has(cb.callback_id);

              return (
                <div key={cb.callback_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        {cb.caller_name || 'Άγνωστος Καλούν'}
                      </p>
                      <a
                        href={`tel:${phone}`}
                        className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <PhoneIcon className="w-3.5 h-3.5" />
                        {phone || '-'}
                      </a>
                    </div>

                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase border ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {isDone ? 'Ολοκληρώθηκε' : 'Εκκρεμεί'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-700">Λόγος: </span>
                    {getReasonLabel(reason)}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {formatDate((cb as any).created_at)}
                    </span>

                    {!isDone && (
                      <button
                        onClick={() => handleMarkAsCompleted(cb.callback_id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white transition-colors text-xs font-semibold text-slate-700 rounded-lg flex items-center gap-1.5"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Ολοκλήρωση
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="p-3.5">Όνομα Καλούντος</th>
                <th className="p-3.5">Τηλέφωνο</th>
                <th className="p-3.5">Λόγος Κλήσης</th>
                <th className="p-3.5">Ημερομηνία</th>
                <th className="p-3.5">Κατάσταση</th>
                <th className="p-3.5 text-right">Ενέργεια</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    Φόρτωση αιτημάτων...
                  </td>
                </tr>
              ) : filteredCallbacks.length > 0 ? (
                filteredCallbacks.map((cb) => {
                  const phone = (cb as any).phone_normalized || (cb as any).callback_phone_normalized || cb.phone;
                  const reason = (cb as any).callback_reason_code || (cb as any).reason;
                  const isDone = completedIds.has(cb.callback_id);

                  return (
                    <tr key={cb.callback_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-bold text-slate-800">
                        {cb.caller_name || 'Άγνωστος Καλούν'}
                      </td>
                      <td className="p-3.5 font-semibold text-blue-600">
                        <a href={`tel:${phone}`} className="hover:underline">
                          {phone || '-'}
                        </a>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">
                        {getReasonLabel(reason)}
                      </td>
                      <td className="p-3.5 text-slate-500">{formatDate((cb as any).created_at)}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isDone ? 'Ολοκληρώθηκε' : 'Εκκρεμεί'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {!isDone ? (
                          <button
                            onClick={() => handleMarkAsCompleted(cb.callback_id)}
                            className="px-3 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white transition-colors font-semibold text-slate-700 rounded-lg inline-flex items-center gap-1"
                          >
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            Μαρκάρισμα ως Ολοκληρωμένο
                          </button>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-medium inline-flex items-center gap-1">
                            <CheckCircleIcon className="w-4 h-4" /> Διεκπεραιώθηκε
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    {activeTab === 'pending'
                      ? 'Όλα τα αιτήματα επικοινωνίας έχουν διεκπεραιωθεί!'
                      : 'Δεν βρέθηκαν αιτήματα.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}