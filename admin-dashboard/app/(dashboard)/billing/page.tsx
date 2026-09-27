'use client';

import React, { useEffect, useRef } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';
import { 
  CreditCardIcon, 
  PhoneIcon, 
  ChatBubbleLeftEllipsisIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Plan {
  id: string;
  code: string;
  version: number;
  name: string;
  price_minor: string | number;
  currency: string;
}

interface VoiceAccess {
  state: 'allowed' | 'active' | 'suspended' | 'canceled' | string;
  reason?: string | null;
  billing_period_id?: string | null;
}

interface BillingPeriod {
  billing_period_id: string;
  clinic_id?: string;
  starts_at?: string;
  ends_at?: string;
  plan?: Plan;
  plan_included_minutes?: number;
  extra_included_minutes?: number;
  total_included_minutes?: number;
  included_sms_messages?: number;
  extra_included_sms_messages?: number;
  used_sms_messages?: number;
  remaining_sms_messages?: number;
  provider_segment_count?: number;
  used_duration_ms?: number;
  used_minutes?: number;
  remaining_duration_ms?: number;
  remaining_minutes?: number;
  overage_duration_ms?: number;
  overage_minutes?: number;
  started_call_count?: number;
  total_amount?: string | number;
  status?: string;
}

export default function BillingPage() {
  const { isOwner, selectedClinic, isLoading: isClinicLoading } = useClinic();
  const { billing: cachedBilling, loadingTab, fetchBilling } = useDashboard();

  const fetchBillingRef = useRef(fetchBilling);
  useEffect(() => {
    fetchBillingRef.current = fetchBilling;
  }, [fetchBilling]);

  // Fetch billing data whenever clinic finishes loading or changes
  useEffect(() => {
    if (!isClinicLoading && selectedClinic?.id) {
      fetchBillingRef.current();
    }
  }, [selectedClinic?.id, isClinicLoading]);

  const isLoading = isClinicLoading || (loadingTab === 'billing' && !cachedBilling);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse max-w-7xl mx-auto dark:bg-slate-900 min-h-screen">
        <div className="h-8 w-64 bg-gray-200 dark:bg-slate-800 rounded"></div>
        <div className="h-24 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="h-64 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
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

  const rawData = (cachedBilling as Record<string, any>)?.data || cachedBilling;
  const voiceAccess: VoiceAccess | undefined = rawData?.voice_access;

  let periods: BillingPeriod[] = [];
  if (Array.isArray(rawData?.billing_periods)) {
    periods = rawData.billing_periods;
  } else if (rawData?.billing_period) {
    periods = [rawData.billing_period];
  } else if (Array.isArray(rawData)) {
    periods = rawData;
  }

  const voiceState = voiceAccess?.state || 'unknown';
  const voiceReason = voiceAccess?.reason;
  const isVoiceAllowed = voiceState === 'allowed' || voiceState === 'active';

  const activePeriod = periods.find((p) => p.billing_period_id === voiceAccess?.billing_period_id) || periods[0];

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleDateString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatPrice = (priceMinor?: string | number, currency = 'EUR') => {
    if (priceMinor === undefined || priceMinor === null) return '€0.00';
    const amount = Number(priceMinor) / 100;
    return new Intl.NumberFormat('el-GR', { style: 'currency', currency }).format(amount);
  };

  const handleRefresh = () => {
    fetchBilling(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto transition-colors duration-200 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCardIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            Billing & Call Usage
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
            Επισκόπηση συνδρομής, χρήσης λεπτών, SMS και ιστορικού χρεώσεων για την κλινική{' '}
            <span className="font-semibold text-gray-800 dark:text-slate-200">{selectedClinic?.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleRefresh}
            disabled={loadingTab === 'billing'}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${loadingTab === 'billing' ? 'animate-spin' : ''}`} />
            Ανανέωση
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 rounded-full border border-gray-200 dark:border-slate-700">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Read-Only
          </div>
        </div>
      </div>

      {/* Voice Access Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all ${
          isVoiceAllowed
            ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-300'
            : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${isVoiceAllowed ? 'bg-emerald-100 dark:bg-emerald-900/60' : 'bg-amber-100 dark:bg-amber-900/60'}`}>
            {isVoiceAllowed ? (
              <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm capitalize flex items-center gap-2">
              <span>Πρόσβαση Φωνητικού Βοηθού (Voice Access):</span>
              <span className="font-extrabold uppercase tracking-wide">{voiceState}</span>
            </div>
            {voiceReason && (
              <div className="text-xs text-amber-800/80 dark:text-amber-400 mt-0.5 font-medium">
                Αιτία: <span className="font-mono bg-amber-100/80 dark:bg-amber-900/80 px-1.5 py-0.5 rounded">{voiceReason}</span>
              </div>
            )}
          </div>
        </div>

        <span
          className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg border self-start sm:self-auto ${
            isVoiceAllowed
              ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
              : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
          }`}
        >
          {voiceState}
        </span>
      </div>

      {/* Metric Cards Grid */}
      {activePeriod && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Ενεργό Πλάνο</span>
              <CreditCardIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 capitalize">
                {activePeriod.plan?.name || 'Starter'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                {formatPrice(activePeriod.plan?.price_minor, activePeriod.plan?.currency)} / μήνα
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Λεπτά Ομιλίας</span>
              <PhoneIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {activePeriod.used_minutes ?? 0} <span className="text-xs text-slate-400 font-normal">/ {activePeriod.total_included_minutes ?? 0} min</span>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                {activePeriod.remaining_minutes ?? 0} λεπτά υπόλοιπο
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Μηνύματα SMS</span>
              <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {activePeriod.used_sms_messages ?? 0} <span className="text-xs text-slate-400 font-normal">/ {(activePeriod.included_sms_messages ?? 0) + (activePeriod.extra_included_sms_messages ?? 0)} SMS</span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-semibold">
                {activePeriod.remaining_sms_messages ?? 0} SMS διαθέσιμα
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
              <span className="text-[11px] font-bold uppercase tracking-wider">Συνολικές Κλήσεις</span>
              <ClockIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {activePeriod.started_call_count ?? 0}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Περίοδος: {formatDate(activePeriod.starts_at)} - {formatDate(activePeriod.ends_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Ιστορικό Περιόδων Χρέωσης</h2>
        </div>

        {periods.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <CreditCardIcon className="w-6 h-6 text-gray-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-slate-300">
              Δεν υπάρχουν διαθέσιμες περίοδοι χρέωσης για αυτή την κλινική.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700 font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Περίοδος</th>
                  <th className="py-3.5 px-5">Πλάνο</th>
                  <th className="py-3.5 px-5">Χρήση Λεπτών</th>
                  <th className="py-3.5 px-5">SMS</th>
                  <th className="py-3.5 px-5">Κλήσεις</th>
                  <th className="py-3.5 px-5">Ποσό</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
                {periods.map((period, idx) => (
                  <tr key={period.billing_period_id || idx} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-gray-900 dark:text-slate-100">
                      {formatDate(period.starts_at)} — {formatDate(period.ends_at)}
                    </td>
                    <td className="py-3.5 px-5 capitalize font-semibold text-blue-600 dark:text-blue-400">
                      {period.plan?.name || 'Starter'}
                    </td>
                    <td className="py-3.5 px-5 font-medium">
                      {period.used_minutes ?? 0} / {period.total_included_minutes ?? 0} min
                    </td>
                    <td className="py-3.5 px-5 font-medium">
                      {period.used_sms_messages ?? 0} / {(period.included_sms_messages ?? 0) + (period.extra_included_sms_messages ?? 0)} SMS
                    </td>
                    <td className="py-3.5 px-5 font-medium">
                      {period.started_call_count ?? 0}
                    </td>
                    <td className="py-3.5 px-5 font-bold text-gray-900 dark:text-slate-100">
                      {formatPrice(period.total_amount ?? period.plan?.price_minor, period.plan?.currency)}
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