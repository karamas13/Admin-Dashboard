'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/services/api';
import { Closure } from '@/types';
import { TrashIcon, PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useClinic } from '@/context/ClinicContext';

const CLINIC_ID = process.env.NEXT_PUBLIC_SUPABASE_CLINIC_ID;

const getReasonLabel = (code: string) => {
  const map: Record<string, string> = {
    closed: 'Κλειστό',
    holiday: 'Επίσημη Αργία',
    vacation: 'Διακοπές',
    personal: 'Προσωπικός Λόγος',
    other: 'Άλλο',
  };
  return map[code?.toLowerCase()] || code || 'Κλειστό';
};

export default function ClosuresPage() {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { isReadOnly, isOwner } = useClinic();
  const isActionDisabled = isReadOnly || !isOwner;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form State για νέα Αργία
  const [reasonCode, setReasonCode] = useState('closed');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Φόρτωση Closures για δυναμικό εύρος (Τρέχων μήνας + Επόμενος)
  const loadClosures = useCallback(async () => {
  try {
    setIsLoading(true);
    setError('');

    const now = new Date();
    // Αρχή τρέχοντος μήνα
    const startAt = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
    // Τέλος επόμενου μήνα
    const endAt = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();

    // 🎯 ΠΡΟΣΟΧΗ: Περνάμε και το CLINIC_ID ως 3ο όρισμα!
    const data = await api.getClosures(startAt, endAt, CLINIC_ID);

    if (data && data.success) {
      setClosures(data.closures || []);
    } else if (Array.isArray(data)) {
      setClosures(data);
    }
  } catch (err: any) {
    console.error('Σφάλμα κατά τη φόρτωση των closures:', err);
    setError('Αποτυχία φόρτωσης κλειστών ημερών.');
  } finally {
    setIsLoading(false);
  }
}, []);

  useEffect(() => {
    loadClosures();
  }, [loadClosures]);

  // 2. Υποβολή Νέου Κλεισίματος
  const handleCreateClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startsAt || !endsAt) {
      alert('Παρακαλώ συμπληρώστε ημερομηνία έναρξης και λήξης.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        clinic_id: CLINIC_ID,
        reason_code: reasonCode,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      };

      if (api.createClosure) {
        await api.createClosure(payload);
      } else {
        // Fallback αν χρησιμοποιείται γενική μέθοδος
        await api.getClosures(payload.starts_at, payload.ends_at); 
      }

      setIsAddModalOpen(false);
      setStartsAt('');
      setEndsAt('');
      loadClosures(); // Re-fetch
    } catch (err) {
      console.error('Error creating closure:', err);
      alert('Σφάλμα κατά την δημιουργία της αργίας.');
    } finally {
      setIsSubmitting(false);
    }
  };
// 3. Διαγραφή Κλεισίματος
const handleDeleteClosure = async (schedule_exception_id: string) => {
  if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την αργία;')) return;

  try {
    setIsDeleting(schedule_exception_id);
    if (api.deleteClosure) {
      await api.deleteClosure(schedule_exception_id);
    }

    setClosures(prev =>
      prev.filter((c: any) => (c.schedule_exception_id || c.id || c.schedule_exception_id) !== schedule_exception_id)
    );
  } catch (err) {
    console.error('Error deleting closure:', err);
    alert('Αποτυχία διαγραφής.');
  } finally {
    setIsDeleting(null);
  }
};

  // Format Helper
  const formatDate = (isoString: string) => {
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
              Κλείσιμο Ημερών & Αργίες
            </h2>
            {isLoading && (
              <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ορίστε χρονικά διαστήματα κατά τα οποία η AI Receptionist δεν θα επιτρέπει κρατήσεις.
          </p>
        </div>

      <button
         onClick={() => setIsAddModalOpen(true)}
         disabled={isActionDisabled}
         title={
           !isOwner 
             ? "Μόνο ο διαχειριστής (Owner) μπορεί να προσθέσει εξαιρέσεις." 
             : isReadOnly 
             ? "Η λειτουργία δεν είναι διαθέσιμη σε κατάσταση Read-Only" 
             : ""
         }
         className={`w-full sm:w-auto px-4 py-2.5 font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 ${
           isActionDisabled 
             ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70' 
             : 'bg-blue-600 hover:bg-blue-700 text-white'
         }`}
       >
  <PlusIcon className="w-4 h-4" />
  Προσθήκη Εξαίρεσης
</button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Closures Content: Desktop Table & Mobile Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* --- 1. Mobile View (Cards) --- */}
        <div className="block md:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-slate-400">Φόρτωση δεδομένων...</div>
          ) : closures.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Δεν έχουν καταχωρηθεί κλειστές ημέρες.
            </div>
          ) : (
            closures.map((c) => (
              <div key={c.schedule_exception_id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-[10px] uppercase rounded-md border border-amber-200">
                    {getReasonLabel(c.reason_code)}
                  </span>
                  <button
                    onClick={() => handleDeleteClosure(c.schedule_exception_id)}
                    disabled={isDeleting === c.schedule_exception_id}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p><span className="font-semibold text-slate-700">Έναρξη:</span> {formatDate(c.starts_at)}</p>
                  <p><span className="font-semibold text-slate-700">Λήξη:</span> {formatDate(c.ends_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* --- 2. Desktop View (Table) --- */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="p-3.5">Αιτιολογία</th>
                <th className="p-3.5">Έναρξη</th>
                <th className="p-3.5">Λήξη</th>
                <th className="p-3.5 text-right">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    Φόρτωση δεδομένων...
                  </td>
                </tr>
              ) : closures.length > 0 ? (
                closures.map((c) => (
                  <tr key={c.schedule_exception_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-bold uppercase text-slate-800">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {getReasonLabel(c.reason_code)}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium">{formatDate(c.starts_at)}</td>
                    <td className="p-3.5 font-medium">{formatDate(c.ends_at)}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteClosure(c.schedule_exception_id)}
                        disabled={isDeleting === c.schedule_exception_id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Διαγραφή"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    Δεν έχουν καταχωρηθεί κλειστές ημέρες για το επιλεγμένο διάστημα.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* --- ADD CLOSURE MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                Προσθήκη Νέας Αργίας / Κλεισίματος
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClosure} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Αιτιολογία</label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:border-blue-500 font-medium"
                >
                  <option value="HOLIDAY">Επίσημη Αργία</option>
                  <option value="VACATION">Διακοπές</option>
                  <option value="PERSONAL">Προσωπικός Λόγος</option>
                  <option value="OTHER">Άλλο</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Έναρξη (Ημερομηνία & Ώρα)</label>
                <input
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Λήξη (Ημερομηνία & Ώρα)</label>
                <input
                  type="datetime-local"
                  required
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm transition-colors"
                >
                  {isSubmitting ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}