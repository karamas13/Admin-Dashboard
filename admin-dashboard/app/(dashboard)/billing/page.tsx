'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';
import { 
  CreditCardIcon, 
  PhoneIcon, 
  ChatBubbleLeftEllipsisIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
  DocumentTextIcon,
  ChartBarIcon
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

  useEffect(() => {
    if (!isClinicLoading && selectedClinic?.id) {
      fetchBillingRef.current();
    }
  }, [selectedClinic?.id, isClinicLoading]);

  const isLoading = isClinicLoading || (loadingTab === 'billing' && !cachedBilling);

  const rawData = useMemo(() => {
    return (cachedBilling as Record<string, any>)?.data || cachedBilling;
  }, [cachedBilling]);

  const voiceAccess: VoiceAccess | undefined = rawData?.voice_access;

  const periods: BillingPeriod[] = useMemo(() => {
    if (Array.isArray(rawData?.billing_periods)) {
      return rawData.billing_periods;
    } else if (rawData?.billing_period) {
      return [rawData.billing_period];
    } else if (Array.isArray(rawData)) {
      return rawData;
    }
    return [];
  }, [rawData]);

  const voiceState = voiceAccess?.state || 'unknown';
  const voiceReason = voiceAccess?.reason;
  const isVoiceAllowed = voiceState === 'allowed' || voiceState === 'active';

  const activePeriod = useMemo(() => {
    return periods.find((p) => p.billing_period_id === voiceAccess?.billing_period_id) || periods[0];
  }, [periods, voiceAccess?.billing_period_id]);

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
    if (priceMinor === undefined || priceMinor === null) return '€0,00';
    const amount = Number(priceMinor) / 100;
    return new Intl.NumberFormat('el-GR', { style: 'currency', currency }).format(amount);
  };

  const handleRefresh = () => {
    fetchBilling(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto min-h-screen text-slate-900 dark:text-slate-100">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 p-6 rounded-xl shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
            <ShieldExclamationIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Περιορισμένη Πρόσβαση</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Δεν διαθέτετε τα απαραίτητα δικαιώματα για την προβολή των στοιχείων χρέωσης. Η πρόσβαση επιτρέπεται αποκλειστικά στον <span className="font-semibold text-slate-800 dark:text-slate-200">Ιδιοκτήτη (Owner)</span> της κλινικής.
          </p>
        </div>
      </div>
    );
  }

  // Υπολογισμοί ποσοστών χρήσης
  const totalMinutes = activePeriod?.total_included_minutes || 1;
  const usedMinutes = activePeriod?.used_minutes || 0;
  const minutesPct = Math.min(100, Math.round((usedMinutes / totalMinutes) * 100));

  const totalSms = (activePeriod?.included_sms_messages || 0) + (activePeriod?.extra_included_sms_messages || 0) || 1;
  const usedSms = activePeriod?.used_sms_messages || 0;
  const smsPct = Math.min(100, Math.round((usedSms / totalSms) * 100));

  // Donut Graph SVG parameters
  const radius = 32;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 pb-12">
      {/* Κεφαλίδα / Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Συνδρομή & Χρήση Πόρων
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Επισκόπηση πλάνου, ορίων κλήσεων και ιστορικού τιμολόγησης για την επιχείρηση{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClinic?.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
              Μόνο Ανάγνωση
            </span>
          </div>
        </div>
      </div>

      {/* Κατάσταση Πρόσβασης Φωνητικής Υπηρεσίας */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors ${
          isVoiceAllowed
            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-300'
            : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              isVoiceAllowed
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
            }`}
          >
            {isVoiceAllowed ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5" />
            )}
          </div>
          <div className="space-y-0.5">
            <div className="text-xs sm:text-sm font-semibold flex items-center gap-2">
              <span>Φωνητικός Βοηθός:</span>
              <span className="font-bold uppercase tracking-wide">
                {voiceState === 'allowed' || voiceState === 'active' ? 'ΕΝΕΡΓΟΣ' : voiceState}
              </span>
            </div>
            {voiceReason && (
              <p className="text-xs text-amber-800 dark:text-amber-400">
                Aιτιολογία: <span className="font-mono">{voiceReason}</span>
              </p>
            )}
          </div>
        </div>

        <span
          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border self-start sm:self-auto ${
            isVoiceAllowed
              ? 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
              : 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
          }`}
        >
          {isVoiceAllowed ? 'Ενεργή Πρόσβαση' : 'Περιορισμένη Πρόσβαση'}
        </span>
      </div>

      {/* Κατανάλωση Πόρων Τρέχουσας Περιόδου (Με SVG Donut Charts) */}
      {activePeriod && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Στοιχεία Πλάνου */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Τρέχον Πλάνο</span>
                <CreditCardIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 capitalize">
                  {activePeriod.plan?.name || 'Βασικό Πλάνο'}
                </h3>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1">
                  {formatPrice(activePeriod.plan?.price_minor, activePeriod.plan?.currency)} <span className="text-xs font-normal text-slate-400">/ μήνα</span>
                </p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 shrink-0 text-slate-400" />
              <span>
                Περίοδος: {formatDate(activePeriod.starts_at)} — {formatDate(activePeriod.ends_at)}
              </span>
            </div>
          </div>

          {/* 2. Donut Chart - Λεπτά Ομιλίας */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Λεπτά Ομιλίας</span>
              <PhoneIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="mt-3 flex items-center justify-between gap-4">
              {/* Micro Donut Chart */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    className="stroke-emerald-500 transition-all duration-700 ease-out"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (minutesPct / 100) * circumference}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-slate-800 dark:text-slate-200">
                  {minutesPct}%
                </span>
              </div>

              {/* Data labels */}
              <div className="flex-1 space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Καταναλώθηκαν</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {usedMinutes} <span className="text-xs font-normal text-slate-400">/ {totalMinutes} λεπτά</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Υπόλοιπο:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {activePeriod.remaining_minutes ?? 0} λεπτά
              </span>
            </div>
          </div>

          {/* 3. Donut Chart - Μηνύματα SMS */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Μηνύματα SMS</span>
              <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="mt-3 flex items-center justify-between gap-4">
              {/* Micro Donut Chart */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    className="stroke-slate-100 dark:stroke-slate-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={radius}
                    className="stroke-blue-500 transition-all duration-700 ease-out"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (smsPct / 100) * circumference}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-slate-800 dark:text-slate-200">
                  {smsPct}%
                </span>
              </div>

              {/* Data labels */}
              <div className="flex-1 space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Απεσταλμένα</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {usedSms} <span className="text-xs font-normal text-slate-400">/ {totalSms} SMS</span>
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Διαθέσιμα:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {activePeriod.remaining_sms_messages ?? 0} SMS
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Πίνακας Ιστορικού */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Ιστορικό Περιόδων Χρέωσης
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {periods.length} {periods.length === 1 ? 'εγγραφή' : 'εγγραφές'}
          </span>
        </div>

        {periods.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CreditCardIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Δεν βρέθηκαν διαθέσιμες περίοδοι χρέωσης.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Περίοδος</th>
                  <th className="py-3 px-4">Πλάνο</th>
                  <th className="py-3 px-4">Χρήση Λεπτών</th>
                  <th className="py-3 px-4">SMS</th>
                  <th className="py-3 px-4 text-center">Κλήσεις</th>
                  <th className="py-3 px-4 text-right">Συνολικό Ποσό</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                {periods.map((period, idx) => (
                  <tr key={period.billing_period_id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatDate(period.starts_at)} — {formatDate(period.ends_at)}
                    </td>
                    <td className="py-3.5 px-4 capitalize font-semibold text-blue-600 dark:text-blue-400">
                      {period.plan?.name || 'Βασικό Πλάνο'}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {period.used_minutes ?? 0} / {period.total_included_minutes ?? 0} λεπτά
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {period.used_sms_messages ?? 0} / {(period.included_sms_messages ?? 0) + (period.extra_included_sms_messages ?? 0)} SMS
                    </td>
                    <td className="py-3.5 px-4 font-mono text-center">
                      {period.started_call_count ?? 0}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 text-right">
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