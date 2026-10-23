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
  ChartBarIcon,
  SparklesIcon,
  BoltIcon,
  ArrowTrendingUpIcon
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

// 1. Metric Card Component
function AnalyticsMetricCard({ label, value, icon: IconComponent, highlighted = false }: { label: string; value: string | number; icon: any; highlighted?: boolean }) {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between gap-3 shadow-xs transition-all ${
      highlighted 
        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60' 
        : 'bg-white dark:bg-[#101622] border-slate-200 dark:border-slate-800/80'
    }`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl ${highlighted ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
          <IconComponent className="w-4 h-4" />
        </div>
        {highlighted && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
            Κύριο Πλάνο
          </span>
        )}
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 truncate">{value}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  );
}

// 2. Circular / Donut Pie Chart Component
function CircularProgressChart({ label, current, total, unit, strokeColorClass }: { label: string; current: number; total: number; unit: string; strokeColorClass: string }) {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-slate-50/60 dark:bg-[#0D121C] p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 flex items-center gap-3 sm:gap-4">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={radius}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            className={`${strokeColorClass} transition-all duration-700 ease-out`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <span className="absolute text-[11px] sm:text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
          {percentage}%
        </span>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{label}</h4>
        <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-slate-100 truncate">
          {current.toLocaleString('el-GR')} <span className="text-[11px] sm:text-xs font-normal text-slate-400">/ {total.toLocaleString('el-GR')} {unit}</span>
        </p>
        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
          Υπόλοιπο: <span className="font-semibold text-slate-700 dark:text-slate-300">{(total - current).toLocaleString('el-GR')} {unit}</span>
        </p>
      </div>
    </div>
  );
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
  const isRefreshing = loadingTab === 'billing' && !!cachedBilling;

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

  // Format date strictly as ηη/μμ/ετος (DD/MM/YYYY)
  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-dvh text-slate-900 dark:text-slate-100" role="status" aria-label="Φόρτωση στοιχείων χρέωσης">
        <div className="h-20 bg-slate-200 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
        <div className="h-16 bg-slate-200 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-slate-200 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
          <div className="h-32 bg-slate-200 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
        </div>
        <div className="h-64 bg-slate-200 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-[#101622] border border-amber-200 dark:border-amber-900/60 p-6 rounded-3xl shadow-xl text-center space-y-3" role="alert">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-800">
            <ShieldExclamationIcon className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Περιορισμένη Πρόσβαση</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Δεν διαθέτετε τα απαραίτητα δικαιώματα για την προβολή των στοιχείων χρέωσης. Η πρόσβαση επιτρέπεται αποκλειστικά στον <span className="font-semibold text-slate-800 dark:text-slate-200">Ιδιοκτήτης (Owner)</span> της κλινικής.
          </p>
        </div>
      </div>
    );
  }

  const totalMinutes = activePeriod?.total_included_minutes || 0;
  const usedMinutes = activePeriod?.used_minutes || 0;
  const totalSms = (activePeriod?.included_sms_messages || 0) + (activePeriod?.extra_included_sms_messages || 0);
  const usedSms = activePeriod?.used_sms_messages || 0;
  const totalCalls = activePeriod?.started_call_count || 0;

  const maxPeriodMinutes = Math.max(1, ...periods.map(p => p.used_minutes || 0));

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 pb-12 font-sans selection:bg-emerald-500/30">
      
      {/* Header Toolbar */}
      <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 shadow-xs dark:shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Συνδρομή & Analytics Χρέωσης
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Προηγμένη ανάλυση πόρων, κυκλικά διαγράμματα κατανάλωσης και ιστορικές τάσεις για την επιχείρηση{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedClinic?.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer flex-1 sm:flex-initial"
              aria-label="Ανανέωση δεδομένων"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
              <span>Ανανέωση</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
              Μόνο Ανάγνωση
            </span>
          </div>
        </div>
      </div>

      {/* Voice Assistant Access Status */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors ${
          isVoiceAllowed
            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-300'
            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 text-amber-950 dark:text-amber-300'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-xl shrink-0 mt-0.5 sm:mt-0 ${
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
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs sm:text-sm font-semibold flex flex-wrap items-center gap-2">
              <span>Φωνητικός Βοηθός:</span>
              <span className="font-bold uppercase tracking-wide">
                {voiceState === 'allowed' || voiceState === 'active' ? 'ΕΝΕΡΓΟΣ' : voiceState}
              </span>
            </div>
            {voiceReason && (
              <p className="text-xs text-amber-800 dark:text-amber-400 truncate">
                Aιτιολογία: <span className="font-mono">{voiceReason}</span>
              </p>
            )}
          </div>
        </div>

        <span
          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border self-start sm:self-auto shrink-0 ${
            isVoiceAllowed
              ? 'bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
              : 'bg-amber-100/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
          }`}
        >
          {isVoiceAllowed ? 'Ενεργή Πρόσβαση' : 'Περιορισμένη Πρόσβαση'}
        </span>
      </div>

      {/* Analytics Summary Metric Cards */}
      {activePeriod && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Σύνοψη Πόρων Τρέχουσας Περιόδου
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <AnalyticsMetricCard 
              label="Ενεργό Πλάνο Συνδρομής" 
              value={activePeriod.plan?.name || 'Βασικό'} 
              icon={SparklesIcon} 
              highlighted 
            />
            <AnalyticsMetricCard 
              label="Συνολικές Κλήσεις AI" 
              value={totalCalls} 
              icon={PhoneIcon} 
            />
            <AnalyticsMetricCard 
              label="Καταναλωμένος Χρόνος" 
              value={`${usedMinutes.toFixed(1)} λ.`} 
              icon={ClockIcon} 
            />
            <AnalyticsMetricCard 
              label="Απεσταλμένα SMS" 
              value={usedSms} 
              icon={ChatBubbleLeftEllipsisIcon} 
            />
          </div>

          {/* Circular / Pie Charts Card */}
          <div className="bg-white dark:bg-[#101622] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <BoltIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                   Διαγράμματα Κατανάλωσης 
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {formatDate(activePeriod.starts_at)} — {formatDate(activePeriod.ends_at)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1">
              <CircularProgressChart 
                label="Λεπτά Ομιλίας" 
                current={Number(usedMinutes.toFixed(2))} 
                total={totalMinutes} 
                unit="λεπτά" 
                strokeColorClass="stroke-emerald-500 dark:stroke-emerald-400" 
              />
              <CircularProgressChart 
                label="Μηνύματα SMS" 
                current={usedSms} 
                total={totalSms} 
                unit="SMS" 
                strokeColorClass="stroke-blue-500 dark:stroke-blue-400" 
              />
            </div>
          </div>
        </div>
      )}

      {/* Historical Trend / Bar Chart with Clear Date Ranges in DD/MM/YYYY */}
      {periods.length > 0 && (
        <div className="bg-white dark:bg-[#101622] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-4 h-4 text-blue-500 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Ιστορικό Χρήσης Λεπτών ανά Περίοδο
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {periods.length} {periods.length === 1 ? 'περίοδος' : 'περίοδοι'}
            </span>
          </div>

          <div className="pt-2">
            <div className="flex items-end gap-3 min-h-42.5 pt-4 pb-2 px-1 overflow-x-auto">
              {periods.map((p, idx) => {
                const uMin = p.used_minutes || 0;
                const heightPct = Math.max(8, Math.round((uMin / maxPeriodMinutes) * 100));
                const startDateFormatted = formatDate(p.starts_at);
                const endDateFormatted = formatDate(p.ends_at);

                return (
                  <div key={p.billing_period_id || idx} className="flex-1 min-w-27.5 sm:min-w-30 flex flex-col items-center gap-2 group">
                    <span className="text-[11px] font-bold font-mono text-slate-700 dark:text-slate-300">
                      {uMin.toFixed(1)}'
                    </span>
                    <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-t-xl h-28 flex items-end overflow-hidden p-1">
                      <div 
                        className="w-full bg-blue-500 dark:bg-blue-400 rounded-t-lg transition-all duration-500 group-hover:bg-emerald-500"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    {/* Ξεκάθαρες ημερομηνίες περιόδου σε μορφή ηη/μμ/ετος */}
                    <div className="text-center px-1.5 py-1.5 bg-slate-50 dark:bg-[#0D121C] border border-slate-200 dark:border-slate-800 rounded-xl w-full">
                      <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {startDateFormatted}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        έως {endDateFormatted}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white dark:bg-[#101622] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0D121C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-500 shrink-0" />
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
            <table className="w-full text-left border-collapse min-w-162.5">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#0D121C] text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Περίοδος</th>
                  <th className="py-3 px-4">Πλάνο</th>
                  <th className="py-3 px-4">Χρήση Λεπτών</th>
                  <th className="py-3 px-4">SMS</th>
                  <th className="py-3 px-4 text-center">Κλήσεις</th>
                  <th className="py-3 px-4 text-right">Συνολικό Ποσό</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                {periods.map((period, idx) => (
                  <tr key={period.billing_period_id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatDate(period.starts_at)} — {formatDate(period.ends_at)}
                    </td>
                    <td className="py-3.5 px-4 capitalize font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {period.plan?.name || 'Βασικό Πλάνο'}
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                      {period.used_minutes?.toFixed(2) ?? 0} / {period.total_included_minutes ?? 0} λεπτά
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                      {period.used_sms_messages ?? 0} / {(period.included_sms_messages ?? 0) + (period.extra_included_sms_messages ?? 0)} SMS
                    </td>
                    <td className="py-3.5 px-4 font-mono text-center whitespace-nowrap">
                      {period.started_call_count ?? 0}
                    </td>
                    <td className="py-3.5 px-4 font-bold font-mono text-slate-900 dark:text-slate-100 text-right whitespace-nowrap">
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