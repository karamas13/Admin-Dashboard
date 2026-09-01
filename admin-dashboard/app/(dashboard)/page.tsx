'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/services/api';
import { Appointment } from '@/types';

// Clinic ID (προσαρμόστε το αν χρειάζεται)
const CLINIC_ID = 'c93a8020-b5b0-4a18-9d86-af466e5ab86e';

interface CallbackItem {
  callback_id: string;
  caller_name?: string;
  phone_normalized?: string;
  phone?: string;
  status: string;
  urgency_code: string;
  created_at?: string;
}

export default function DashboardHome() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [callbacks, setCallbacks] = useState<CallbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      // 1. Υπολογισμός εύρους για τη σημερινή ημέρα (00:00 έως 23:59)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      // 2. Παράλληλη κλήση των APIs για Ραντεβού & Callbacks
      const [apptsData, callbacksData] = await Promise.all([
        api.getAppointments(CLINIC_ID, startOfDay, endOfDay).catch(() => []),
        api.getCallbacks ? api.getCallbacks(CLINIC_ID).catch(() => []) : Promise.resolve([])
      ]);

      setAppointments(Array.isArray(apptsData) ? apptsData : apptsData?.appointments || []);
      setCallbacks(Array.isArray(callbacksData) ? callbacksData : callbacksData?.callbacks || []);
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError('Αποτυχία φόρτωσης δεδομένων.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // --- Υπολογισμός Live Στατιστικών ---
  const activeAppointments = appointments.filter((a: any) => a.status !== 'cancelled');
  const cancelledAppointments = appointments.filter((a: any) => a.status === 'cancelled');
  const pendingCallbacks = callbacks.filter((c) => c.status === 'created' || c.status === 'pending');
  const urgentCount = appointments.filter((a: any) => a.urgency_code && a.urgency_code !== 'normal').length;

  // Helper για εμφάνιση ώρας
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-2 sm:p-0">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Κέντρο Ελέγχου Ιατρείου</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ζωντανή επισκόπηση σημερινών ενεργειών & αιτημάτων ασθενών.
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={isLoading}
          className="self-start sm:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoading ? '🔄 Ανανέωση...' : '🔄 Ανανέωση Data'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* --- Live KPIs ( Responsive Grid ) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Κάρτα 1: Σημερινά Ραντεβού */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Σημερινά Ραντεβού</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-lg">📅</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {isLoading ? '...' : activeAppointments.length}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
              {cancelledAppointments.length > 0 ? `+${cancelledAppointments.length} ακυρωμένα` : 'Όλα ενεργά'}
            </p>
          </div>
        </div>

        {/* Κάρτα 2: Εκκρεμή Callbacks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Επανακλήσεις (Callbacks)</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg text-lg">📞</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
              {isLoading ? '...' : pendingCallbacks.length}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
              {pendingCallbacks.length > 0 ? 'Απαιτείται επικοινωνία' : 'Καμία εκκρεμότητα'}
            </p>
          </div>
        </div>

        {/* Κάρτα 3: Επείγοντα */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Επείγοντα</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg text-lg">🚨</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {isLoading ? '...' : urgentCount}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">Υψηλής προτεραιότητας</p>
          </div>
        </div>

        {/* Κάρτα 4: Google Calendar Sync */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Sync</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-lg">🔄</span>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Συγχρονισμένο
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
              Αυτόματος συγχρονισμός 
            </p>
          </div>
        </div>
      </div>

      {/* --- Main Dashboard Sections ( 2 Columns Layout ) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Αριστερή Στήλη: Πρόγραμμα Σημερινών Ραντεβού (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              🗓️ Σημερινό Πρόγραμμα Ραντεβού ({appointments.length})
            </h3>
            <span className="text-xs text-slate-400">{new Date().toLocaleDateString('el-GR')}</span>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">Φόρτωση ραντεβού...</div>
          ) : appointments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Δεν υπάρχουν προγραμματισμένα ραντεβού για σήμερα.
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt: any) => {
                const name =
                  appt.caller_name || appt.patient_name || appt.patient?.name || 'Ανώνυμος Ασθενής';
                const phone =
                  appt.phone_normalized || appt.callback_phone_normalized || appt.phone || '-';
                const isCancelled = appt.status === 'cancelled';

                return (
                  <div
                    key={appt.appointment_id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-colors gap-2 sm:gap-4 ${
                      isCancelled
                        ? 'bg-rose-50/40 border-rose-100 text-slate-400'
                        : 'bg-slate-50/60 hover:bg-slate-50 border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs">
                        {formatTime(appt.start_at)}
                      </div>
                      <div>
                        <p className={`text-xs sm:text-sm font-bold ${isCancelled ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {name}
                        </p>
                        <p className="text-[11px] text-slate-500">{phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        {appt.appointment_type_code === 'cleaning' ? 'Καθαρισμός' : appt.appointment_type_code || 'Γενικό'}
                      </span>
                      {isCancelled ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                          Ακυρωμένο
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                          Ενεργό
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Δεξιά Στήλη: Εκκρεμότητες Callbacks (1/3 width) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-800">📞 Εκκρεμή Callbacks</h3>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {pendingCallbacks.length}
              </span>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Φόρτωση...</div>
            ) : pendingCallbacks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Δεν υπάρχουν εκκρεμή αιτήματα επανάκλησης.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingCallbacks.slice(0, 5).map((cb) => (
                  <div
                    key={cb.callback_id}
                    className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {cb.caller_name || 'Ασθενής'}
                      </p>
                      <p className="text-[11px] text-amber-900 font-medium">
                        {cb.phone_normalized || cb.phone || '-'}
                      </p>
                    </div>
                    {cb.urgency_code !== 'normal' && (
                      <span className="text-[9px] font-extrabold bg-rose-500 text-white px-1.5 py-0.5 rounded">
                        ΕΠΕΙΓΟΝ
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <p className="text-[11px] text-slate-400 text-center">
              Τα callbacks δημιουργούνται αυτόματα από την AI Receptionist όταν ο ασθενής ζητά τηλεφωνική επικοινωνία.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}