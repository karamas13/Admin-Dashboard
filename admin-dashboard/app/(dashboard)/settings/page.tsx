'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';
import { useDashboard } from '@/context/DashboardContext';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'; 
import {
  BuildingOfficeIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const GREEK_LABEL_MAP: Record<string, string> = {
  checkup: 'Εξέταση / Έλεγχος',
  cleaning: 'Καθαρισμός',
  filling: 'Σφράγισμα',
  emergency: 'Έκτακτο',
  pain: 'Οξύς Πόνος',
  whitening: 'Λεύκανση',
  other: 'Άλλο',
  unknown: 'Γενικό Ραντεβού',
};

const DURATION_OPTIONS = [
  { value: 15, label: '15 λεπτά' },
  { value: 30, label: '30 λεπτά' },
  { value: 45, label: '45 λεπτά' },
  { value: 60, label: '1 ώρα (60 λεπτά)' },
  { value: 75, label: '75 λεπτά' },
  { value: 90, label: '1.5 ώρα (90 λεπτά)' },
  { value: 105, label: '105 λεπτά' },
  { value: 120, label: '2 ώρες (120 λεπτά)' },
  { value: 150, label: '2.5 ώρες (150 λεπτά)' },
  { value: 180, label: '3 ώρες (180 λεπτά)' },
  { value: 240, label: '4 ώρες (240 λεπτά)' },
];

function toBackendKey(title: string, index: number): string {
  const greekToLatin: Record<string, string> = {
    α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th',
    ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p',
    ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
    ά: 'a', έ: 'e', ή: 'i', ί: 'i', ό: 'o', ύ: 'y', ώ: 'o', ϊ: 'i', ϋ: 'y', ΐ: 'i', ΰ: 'y'
  };

  const clean = title
    .toLowerCase()
    .split('')
    .map((char) => greekToLatin[char] || char)
    .join('')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return clean || `custom_type_${Date.now()}_${index}`;
}

interface AppointmentType {
  id: string;
  originalKey?: string;
  title: string;
  duration: number;
  prep: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function SettingsPage() {
  const { selectedClinic } = useClinic();
  const { settings, loadingTab, fetchSettings } = useDashboard();

  const [activeTab, setActiveTab] = useState<'general' | 'appointment_types' | 'faqs'>('general');
  const [pendingTab, setPendingTab] = useState<'general' | 'appointment_types' | 'faqs' | null>(null);
  const [showTabModal, setShowTabModal] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Form state
  const [clinicName, setClinicName] = useState('');
  const [timezone, setTimezone] = useState('Europe/Athens');
  const [slotInterval, setSlotInterval] = useState(15);
  const [minNotice, setMinNotice] = useState(30);
  const [workingHours, setWorkingHours] = useState<Record<string, Array<{ start: string; end: string }>>>({});
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Snapshot for dirty tracking
  const [initialState, setInitialState] = useState<{
    clinicName: string;
    timezone: string;
    slotInterval: number;
    minNotice: number;
    types: AppointmentType[];
    faqs: FAQ[];
  } | null>(null);

  useEffect(() => {
    if (selectedClinic?.id) {
      fetchSettings();
    }
  }, [selectedClinic?.id, fetchSettings]);

  useEffect(() => {
    if (!settings) return;
    const data = settings?.settings || settings;

    if (data) {
      const nameVal = data.name || selectedClinic?.name || '';
      const tzVal = data.timezone || 'Europe/Athens';
      const slotVal = Number(data.slot_interval_minutes) || 15;
      const minNoticeVal = Number(data.minimum_booking_notice_minutes) || 30;
      if (data.working_hours_json && typeof data.working_hours_json === 'object') {
        setWorkingHours(data.working_hours_json);
      }

      const durations = data.appointment_duration_minutes_json || {};
      const preps = data.appointment_preparation_json || {};
      const keys = Array.from(new Set([...Object.keys(durations), ...Object.keys(preps)]));

      const loadedTypes: AppointmentType[] = keys.map((key, idx) => {
        const rawPrep = preps[key] || '';
        let parsedTitle = GREEK_LABEL_MAP[key] || key.replace(/_/g, ' ');
        let cleanPrep = rawPrep;

        if (rawPrep.startsWith('[TITLE:')) {
          const match = rawPrep.match(/^\[TITLE:\s*([\s\S]*?)\]\s*([\s\S]*)$/);
          if (match) {
            parsedTitle = match[1];
            cleanPrep = match[2];
          }
        }

        return {
          id: `type_${key}_${idx}`,
          originalKey: key,
          title: parsedTitle,
          duration: Number(durations[key]) || 30,
          prep: cleanPrep,
        };
      });

      const loadedFaqs: FAQ[] = Array.isArray(data.faq_json)
        ? data.faq_json.map((f: any, idx: number) => ({
            id: `faq_${idx}`,
            question: f.q || f.question || '',
            answer: f.a || f.answer || '',
          }))
        : [];

      setClinicName(nameVal);
      setTimezone(tzVal);
      setSlotInterval(slotVal);
      setMinNotice(minNoticeVal);
      setTypes(loadedTypes);
      setFaqs(loadedFaqs);

      setInitialState({
        clinicName: nameVal,
        timezone: tzVal,
        slotInterval: slotVal,
        minNotice: minNoticeVal,
        types: loadedTypes,
        faqs: loadedFaqs,
      });
    }
  }, [settings, selectedClinic?.name]);

  // Unsaved changes flag
  const isDirty = useMemo(() => {
    if (!initialState) return false;

    return (
      clinicName !== initialState.clinicName ||
      timezone !== initialState.timezone ||
      slotInterval !== initialState.slotInterval ||
      minNotice !== initialState.minNotice ||
      JSON.stringify(types) !== JSON.stringify(initialState.types) ||
      JSON.stringify(faqs) !== JSON.stringify(initialState.faqs)
    );
  }, [clinicName, timezone, slotInterval, minNotice, types, faqs, initialState]);

  // Global Navigation Guard (Page routing / Browser back / Tab close)
  const {
    showPrompt: showNavModal,
    confirmNavigation,
    cancelNavigation,
  } = useUnsavedChangesWarning(isDirty);

  // Tab change handler inside settings
  const handleTabChange = (targetTab: 'general' | 'appointment_types' | 'faqs') => {
    if (targetTab === activeTab) return;
    if (isDirty) {
      setPendingTab(targetTab);
      setShowTabModal(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  const confirmDiscardTabChanges = () => {
    if (initialState) {
      setClinicName(initialState.clinicName);
      setTimezone(initialState.timezone);
      setSlotInterval(initialState.slotInterval);
      setMinNotice(initialState.minNotice);
      setTypes(initialState.types);
      setFaqs(initialState.faqs);
    }
    if (pendingTab) {
      setActiveTab(pendingTab);
    }
    setShowTabModal(false);
    setPendingTab(null);
  };

  const addType = () => {
    setTypes((prev) => [{ id: `type_new_${Date.now()}`, title: '', duration: 30, prep: '' }, ...prev]);
  };

  const removeType = (id: string) => {
    setTypes((prev) => prev.filter((t) => t.id !== id));
  };

  const addFaq = () => {
    setFaqs((prev) => [{ id: `faq_new_${Date.now()}`, question: '', answer: '' }, ...prev]);
  };

  const removeFaq = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSuccessMsg('');
      setErrorMsg('');

      const durationsObj: Record<string, number> = {};
      const prepsObj: Record<string, string> = {};

      types.forEach((t, idx) => {
        if (!t.title.trim()) return;
        const key = t.originalKey || toBackendKey(t.title, idx);
        durationsObj[key] = Number(t.duration) || 30;
        prepsObj[key] = `[TITLE: ${t.title.trim()}] ${t.prep.trim()}`;
      });

      const faqsList = faqs
        .filter((f) => f.question.trim())
        .map((f, idx) => ({
          key: `faq_${idx + 1}`,
          q: f.question,
          a: f.answer,
        }));

      const payload = {
        name: clinicName,
        timezone,
        slot_interval_minutes: Number(slotInterval) || 15,
        minimum_booking_notice_minutes: Number(minNotice) || 15,
        working_hours_json: workingHours,
        appointment_duration_minutes_json: durationsObj,
        appointment_preparation_json: prepsObj,
        faq_json: faqsList,
      };

      await api.updateSettings(payload, selectedClinic?.id);
      await fetchSettings(true);
      setSuccessMsg('Οι ρυθμίσεις αποθηκεύτηκαν με επιτυχία!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setErrorMsg(err?.message || 'Αποτυχία αποθήκευσης.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingTab === 'settings' && !settings) {
    return (
      <div className="p-4 sm:p-6 space-y-6 animate-pulse max-w-5xl mx-auto dark:bg-slate-950 min-h-screen">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto transition-colors duration-200 px-2 sm:px-4 md:px-6 pb-28">
      {/* ------------------------------------------------------------- */}
      {/* POPUP 1: PAGE LEAVE / ROUTE NAVIGATION WARNING MODAL          */}
      {/* ------------------------------------------------------------- */}
      {showNavModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 text-amber-500">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl">
                  <ExclamationTriangleIcon className="w-6 h-6 shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Αποχώρηση από τη σελίδα;
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Έχετε μη αποθηκευμένες αλλαγές.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelNavigation}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              Εάν αποχωρήσετε τώρα, όλες οι ΜΗ ΑΠΟΘΗΚΕΥΜΈΝΕΣ τροποποιήσεις στις ρυθμίσεις της επιχείρησής σας θα χαθούν οριστικά.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={cancelNavigation}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Παραμονή στη σελίδα
              </button>
              <button
                type="button"
                onClick={confirmNavigation}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                Αποχώρηση χωρίς αποθήκευση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* POPUP 2: SETTINGS TAB SWITCH WARNING MODAL                     */}
      {/* ------------------------------------------------------------- */}
      {showTabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <ExclamationTriangleIcon className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Μη Αποθηκευμένες Αλλαγές
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Έχετε πραγματοποιήσει αλλαγές που δεν έχουν αποθηκευτεί. Εάν αλλάξετε καρτέλα τώρα, οι αλλαγές σας θα χαθούν.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowTabModal(false);
                  setPendingTab(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Παραμονή
              </button>
              <button
                type="button"
                onClick={confirmDiscardTabChanges}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                Απόρριψη Αλλαγών
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-base md:text-xl font-bold text-slate-800 dark:text-slate-100">Ρυθμίσεις Κλινικής</h1>      
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Διαχειριστείτε τις γενικές πληροφορίες, τους τύπους ραντεβού, τις οδηγίες και τις απαντήσεις της AI Receptionist.
          </p>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
            isDirty
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {isSaving ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              <span>Αποθήκευση...</span>
            </>
          ) : (
            <span>Αποθήκευση Αλλαγών</span>
          )}
        </button>
      </div>

      {/* Status Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto whitespace-nowrap max-w-full">
        <button
          onClick={() => handleTabChange('general')}
          className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'general'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BuildingOfficeIcon className="w-4 h-4 shrink-0" />
          <span>Γενικές Ρυθμίσεις</span>
        </button>
        <button
          onClick={() => handleTabChange('appointment_types')}
          className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'appointment_types'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDaysIcon className="w-4 h-4 shrink-0" />
          <span>Τύποι Ραντεβού</span>
        </button>
        <button
          onClick={() => handleTabChange('faqs')}
          className={`px-3.5 py-2 rounded-lg transition-colors flex items-center gap-2 shrink-0 ${
            activeTab === 'faqs'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <QuestionMarkCircleIcon className="w-4 h-4 shrink-0" />
          <span>Συχνές Ερωτήσεις (FAQs)</span>
        </button>
      </div>

      {/* TAB 1 */}
      {activeTab === 'general' && (
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Όνομα Κλινικής</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Βήμα (Κενό ανάμεσα στα ραντεβού)</label>
              <select
                value={slotInterval}
                onChange={(e) => setSlotInterval(Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors font-medium cursor-pointer"
              >
                <option value={15}>15 λεπτά</option>
                <option value={30}>30 λεπτά</option>
                <option value={45}>45 λεπτά</option>
                <option value={60}>60 λεπτά</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 truncate" title="Ελάχιστος Χρόνος Προειδοποίησης">
                Ελάχιστος Χρόνος Προειδοποίησης
              </label>
              <select
                value={minNotice}
                onChange={(e) => setMinNotice(Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors font-medium cursor-pointer"
              >
                <option value={15}>15 λεπτά</option>
                <option value={30}>30 λεπτά</option>
                <option value={45}>45 λεπτά</option>
                <option value={60}>1 ώρα (60 λεπτά)</option>
                <option value={90}>1.5 ώρα (90 λεπτά)</option>
                <option value={120}>2 ώρες (120 λεπτά)</option>
                <option value={180}>3 ώρες (180 λεπτά)</option>
                <option value={360}>6 ώρες</option>
                <option value={720}>12 ώρες</option>
                <option value={1440}>24 ώρες (1 ημέρα)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 */}
      {activeTab === 'appointment_types' && (
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Τύποι Ραντεβού & Διάρκεια</h2>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Προσθέστε τους τύπους ραντεβού που προσφέρει η επιχείρησή σας.
              </p>
            </div>
            <button
              type="button"
              onClick={addType}
              className="px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4 shrink-0" /> 
              <span>Προσθήκη Τύπου</span>
            </button>
          </div>

          <div className="space-y-4">
            {types.map((t, idx) => {
              const isCustomDuration = !DURATION_OPTIONS.some((opt) => opt.value === t.duration);

              return (
                <div key={t.id} className="p-3.5 md:p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/50">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                      Τύπος #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeType(t.id)}
                      className="px-2.5 py-1.5 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Διαγραφή Τύπου Ραντεβού"
                    >
                      <TrashIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px]">Διαγραφή</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Τίτλος Ραντεβού</label>
                      <input
                        type="text"
                        placeholder="π.χ. Καθαρισμός, Σφράγισμα, Λεύκανση"
                        value={t.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTypes((prev) => prev.map((item) => (item.id === t.id ? { ...item, title: val } : item)));
                        }}
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Διάρκεια</label>
                      <select
                        value={t.duration}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTypes((prev) => prev.map((item) => (item.id === t.id ? { ...item, duration: val } : item)));
                        }}
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium outline-none cursor-pointer"
                      >
                        {isCustomDuration && (
                          <option value={t.duration}>
                            {t.duration} λεπτά (Προσαρμοσμένο)
                          </option>
                        )}
                        {DURATION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Οδηγίες Προετοιμασίας Ασθενούς (Προαιρετικό)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="π.χ. Να προσέλθετε 10 λεπτά νωρίτερα..."
                      value={t.prep}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTypes((prev) => prev.map((item) => (item.id === t.id ? { ...item, prep: val } : item)));
                      }}
                      className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3 */}
      {activeTab === 'faqs' && (
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Συχνές Ερωτήσεις (FAQs)</h2>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Ερωτήσεις και Απαντήσεις που χρησιμοποιεί η AI Receptionist για να απαντά στους πελάτες.
              </p>
            </div>
            <button
              type="button"
              onClick={addFaq}
              className="px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4 shrink-0" /> 
              <span>Προσθήκη Ερώτησης</span>
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((f, idx) => (
              <div key={f.id} className="p-3.5 md:p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-slate-200/60 dark:border-slate-700/50">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                    Ερώτηση #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFaq(f.id)}
                    className="px-2.5 py-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 rounded-lg font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Διαγραφή Ερώτησης"
                  >
                    <TrashIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px]">Διαγραφή</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="π.χ. Πού βρίσκεται η επιχείρηση;"
                  value={f.question}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFaqs((prev) => prev.map((item) => (item.id === f.id ? { ...item, question: val } : item)));
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-100 outline-none"
                />
                <textarea
                  rows={2}
                  placeholder="Απάντηση της AI..."
                  value={f.answer}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFaqs((prev) => prev.map((item) => (item.id === f.id ? { ...item, answer: val } : item)));
                  }}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Bottom Save Banner */}
      {isDirty && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md p-3.5 md:p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <p className="text-xs font-medium text-slate-200 truncate">
              Έχετε μη αποθηκευμένες αλλαγές;
            </p>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                <span>Αποθήκευση...</span>
              </>
            ) : (
              <span>Αποθήκευση</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}