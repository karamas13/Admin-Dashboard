'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';
import {
  BuildingOfficeIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';

const DAYS_OF_WEEK = [
  { id: '1', label: 'Δευτέρα' },
  { id: '2', label: 'Τρίτη' },
  { id: '3', label: 'Τετάρτη' },
  { id: '4', label: 'Πέμπτη' },
  { id: '5', label: 'Παρασκευή' },
  { id: '6', label: 'Σάββατο' },
  { id: '7', label: 'Κυριακή' },
];

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
  const [activeTab, setActiveTab] = useState<'general' | 'appointment_types' | 'faqs'>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // State για το Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Έλεγχος αρχικού theme από το DOM ή το system preference
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
  }, []);


  // 1. Γενικές Ρυθμίσεις & Ωράριο
  const [clinicName, setClinicName] = useState('');
  const [timezone, setTimezone] = useState('Europe/Athens');
  const [slotInterval, setSlotInterval] = useState(30);
  const [minNotice, setMinNotice] = useState(30);
  const [workingHours, setWorkingHours] = useState<Record<string, Array<{ start: string; end: string }>>>({
    '1': [{ start: '09:00', end: '17:00' }],
    '2': [{ start: '09:00', end: '17:00' }],
    '3': [{ start: '09:00', end: '17:00' }],
    '4': [{ start: '09:00', end: '17:00' }],
    '5': [{ start: '09:00', end: '17:00' }],
    '6': [],
    '7': [],
  });

  // 2. Τύποι Ραντεβού
  const [types, setTypes] = useState<AppointmentType[]>([]);

  // 3. FAQs
  const [faqs, setFaqs] = useState<FAQ[]>([]);

  // Φόρτωση Δεδομένων
  useEffect(() => {
    async function loadData() {
      if (!selectedClinic?.id) return;
      try {
        setIsLoading(true);
        const res = await api.getSettings(selectedClinic.id);
        const data = res?.settings || res;

        if (data) {
          setClinicName(data.name || selectedClinic?.name || '');
          setTimezone(data.timezone || 'Europe/Athens');
          setSlotInterval(data.slot_interval_minutes || 30);
          setMinNotice(data.minimum_booking_notice_minutes || 30);
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

          setTypes(loadedTypes);

          if (Array.isArray(data.faq_json)) {
            setFaqs(
              data.faq_json.map((f: any, idx: number) => ({
                id: `faq_${idx}_${Date.now()}`,
                question: f.q || f.question || '',
                answer: f.a || f.answer || '',
              }))
            );
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [selectedClinic?.id, selectedClinic?.name]);

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

  // Αποθήκευση
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
        slot_interval_minutes: Number(slotInterval),
        minimum_booking_notice_minutes: Number(minNotice),
        working_hours_json: workingHours,
        appointment_duration_minutes_json: durationsObj,
        appointment_preparation_json: prepsObj,
        faq_json: faqsList,
      };

      await api.updateSettings(payload, selectedClinic?.id);
      setSuccessMsg('Οι ρυθμίσεις αποθηκεύτηκαν με επιτυχία!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setErrorMsg(err?.message || 'Αποτυχία αποθήκευσης.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse max-w-4xl mx-auto dark:bg-slate-900 min-h-screen">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Ρυθμίσεις Κλινικής</h1>      
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Διαχειριστείτε το ωράριο, τους τύπους ραντεβού, τις οδηγίες και τις απαντήσεις της AI Receptionist.
          </p>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold gap-1">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'general'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BuildingOfficeIcon className="w-4 h-4" /> Γενικά & Ωράριο
        </button>
        <button
          onClick={() => setActiveTab('appointment_types')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'appointment_types'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDaysIcon className="w-4 h-4" /> Τύποι Ραντεβού
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'faqs'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <QuestionMarkCircleIcon className="w-4 h-4" /> Συχνές Ερωτήσεις (FAQs)
        </button>
      </div>

      {/* TAB 1: GENERAL & WORKING HOURS */}
      {activeTab === 'general' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Όνομα Κλινικής</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ζώνη Ώρας</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Βήμα Slot (λεπτά)</label>
              <input
                type="number"
                value={slotInterval}
                onChange={(e) => setSlotInterval(Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ελάχιστος Χρόνος Προειδοποίησης (λεπτά)</label>
              <input
                type="number"
                value={minNotice}
                onChange={(e) => setMinNotice(Number(e.target.value))}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Ωράριο Λειτουργίας */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 mb-3">
              <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Εβδομαδιαίο Ωράριο Λειτουργίας</h3>
            </div>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const slots = workingHours[day.id] || [];
                const isOpen = slots.length > 0;
                const currentSlot = slots[0] || { start: '09:00', end: '17:00' };

                return (
                  <div
                    key={day.id}
                    className="flex items-center justify-between p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 w-32">
                      <input
                        type="checkbox"
                        checked={isOpen}
                        onChange={(e) => {
                          const updated = { ...workingHours };
                          updated[day.id] = e.target.checked ? [{ start: '09:00', end: '17:00' }] : [];
                          setWorkingHours(updated);
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{day.label}</span>
                    </div>

                    {isOpen ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={currentSlot.start}
                          onChange={(e) => {
                            const updated = { ...workingHours };
                            updated[day.id] = [{ start: e.target.value, end: currentSlot.end }];
                            setWorkingHours(updated);
                          }}
                          className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100"
                        />
                        <span className="text-slate-400 font-bold">έως</span>
                        <input
                          type="time"
                          value={currentSlot.end}
                          onChange={(e) => {
                            const updated = { ...workingHours };
                            updated[day.id] = [{ start: currentSlot.start, end: e.target.value }];
                            setWorkingHours(updated);
                          }}
                          className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-medium italic">Κλειστά</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPOINTMENT TYPES */}
      {activeTab === 'appointment_types' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Τύποι Ραντεβού & Διάρκεια</h2>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Προσθέστε τους τύπους ραντεβού που προσφέρει το ιατρείο σας.
              </p>
            </div>
            <button
              type="button"
              onClick={addType}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Προσθήκη Τύπου
            </button>
          </div>

          <div className="space-y-4">
            {types.map((t) => (
              <div key={t.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
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
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Διάρκεια (λεπτά)</label>
                      <input
                        type="number"
                        value={t.duration}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTypes((prev) => prev.map((item) => (item.id === t.id ? { ...item, duration: val } : item)));
                        }}
                        className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeType(t.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors mt-6"
                    title="Διαγραφή"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
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
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: FAQS */}
      {activeTab === 'faqs' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Συχνές Ερωτήσεις (FAQs)</h2>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                Ερωτήσεις και Απαντήσεις που χρησιμοποιεί η AI Receptionist για να απαντά στους ασθενείς.
              </p>
            </div>
            <button
              type="button"
              onClick={addFaq}
              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold rounded-lg flex items-center gap-1 transition-colors"
            >
              <PlusIcon className="w-4 h-4" /> Προσθήκη Ερώτησης
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((f, idx) => (
              <div key={f.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Ερώτηση #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeFaq(f.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="π.χ. Πού βρίσκεται η κλινική;"
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
    </div>
  );
}