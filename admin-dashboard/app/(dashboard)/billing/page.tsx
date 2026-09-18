'use client';

import React, { useEffect, useState } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { api } from '@/services/api';

interface VoiceAccess {
  state: string; // 'suspended' | 'active' | 'canceled'
  reason?: string | null;
  billing_period_id?: string | null;
}

interface BillingPeriod {
  id: string;
  period?: string;
  starts_at?: string;
  ends_at?: string;
  minutes_used?: number;
  total_amount?: string | number;
  status?: string;
  included_minutes?: number;
  used_minutes?: number;
  remaining_minutes?: number;
  overage_minutes?: number;
  total_calls?: number;
}

interface BillingResponse {
  success: boolean;
  voice_access?: VoiceAccess;
  billing_periods?: BillingPeriod[];
  pagination?: {
    limit: number;
    offset: number;
    has_more: boolean;
    next_offset: number | null;
  };
}

export default function BillingPage() {
  const { isOwner, selectedClinic, isLoading: isClinicLoading } = useClinic();
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBilling() {
      if (!selectedClinic) return;
      try {
        setLoading(true);
        setError(null);
        const data = await api.getBilling(selectedClinic.id);
        setBilling(data);
      } catch (err: any) {
        console.error('Error loading billing data:', err);
        setError(err?.message || 'Αποτυχία φόρτωσης στοιχείων χρέωσης.');
      } finally {
        setLoading(false);
      }
    }

    if (!isClinicLoading) {
      fetchBilling();
    }
  }, [selectedClinic, isClinicLoading]);

  if (isClinicLoading || loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse max-w-7xl mx-auto dark:bg-slate-900 min-h-screen">
        <div className="h-8 w-64 bg-gray-200 dark:bg-slate-800 rounded"></div>
        <div className="h-16 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="h-48 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-6 max-w-7xl mx-auto dark:bg-slate-900 min-h-screen">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-sm font-medium">
          ⚠️ Δεν έχετε δικαιώματα πρόσβασης στη σελίδα χρέωσης. Μόνο ο Owner της κλινικής έχει πρόσβαση.
        </div>
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4 dark:bg-slate-900 min-h-screen">
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-800 pb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Billing & Call Usage</h1>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-full border border-gray-200 dark:border-slate-700">
            <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-500"></span>
            Read-Only View
          </div>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm font-medium">
          {error || 'Δεν βρέθηκαν στοιχεία χρέωσης.'}
        </div>
      </div>
    );
  }

  const voiceState = billing.voice_access?.state || 'unknown';
  const voiceReason = billing.voice_access?.reason;
  const periods = billing.billing_periods || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto transition-colors duration-200">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Billing & Call Usage</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Επισκόπηση συνδρομής, χρήσης λεπτών και ιστορικού χρεώσεων για την κλινική{' '}
            <span className="font-semibold text-gray-800 dark:text-slate-200">{selectedClinic?.name}</span>.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-full border border-gray-200 dark:border-slate-700 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-500"></span>
          Read-Only View
        </div>
      </div>

      {/* Voice Access Status Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all ${
          voiceState === 'active'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${
              voiceState === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <div>
            <div className="font-semibold text-sm capitalize">
              Voice Access: {voiceState}
            </div>
            {voiceReason && (
              <div className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5 font-medium">
                Αιτία: <span className="font-mono bg-amber-100/70 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">{voiceReason}</span>
              </div>
            )}
          </div>
        </div>

        <span
          className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md border ${
            voiceState === 'active'
              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
              : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
          }`}
        >
          {voiceState}
        </span>
      </div>

      {/* Billing Periods Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
          <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Billing Periods History</h2>
        </div>

        {periods.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-300">
              Δεν υπάρχουν διαθέσιμες περίοδοι χρέωσης για αυτή την κλινική.
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Οι νέες περίοδοι θα εμφανίζονται αυτόματα μόλις εκδοθούν.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-5 font-semibold">Περίοδος</th>
                  <th className="py-3.5 px-5 font-semibold">Λεπτά Χρήσης</th>
                  <th className="py-3.5 px-5 font-semibold">Συνολικό Ποσό</th>
                  <th className="py-3.5 px-5 font-semibold">Κατάσταση</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {periods.map((period) => (
                  <tr key={period.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-gray-900 dark:text-slate-200">
                      {period.period || `${period.starts_at || ''} - ${period.ends_at || ''}`}
                    </td>
                    <td className="py-3.5 px-5 text-gray-600 dark:text-slate-400 font-medium">
                      {period.minutes_used ?? period.used_minutes ?? 0} min
                    </td>
                    <td className="py-3.5 px-5 text-gray-900 dark:text-slate-200 font-semibold">
                      {period.total_amount ?? '€0.00'}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                        {period.status || 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}