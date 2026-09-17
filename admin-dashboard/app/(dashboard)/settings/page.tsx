'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';
import {
  BuildingOfficeIcon,
  ClockIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Δευτέρα' },
  { id: 'tuesday', label: 'Τρίτη' },
  { id: 'wednesday', label: 'Τετάρτη' },
  { id: 'thursday', label: 'Πέμπτη' },
  { id: 'friday', label: 'Παρασκευή' },
  { id: 'saturday', label: 'Σάββατο' },
  { id: 'sunday', label: 'Κυριακή' },
];

export default function SettingsPage() {
  const { selectedClinic, isReadOnly, isOwner } = useClinic();
  const isActionDisabled = isReadOnly || !isOwner;

  const [activeTab, setActiveTab] = useState<'general' | 'appointment_types' | 'faqs' | 'urgency'>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. General & Schedule Settings
  const [clinicName, setClinicName] = useState('');
  const [timezone, setTimezone] = useState('Europe/Athens');
  const [appointmentInterval, setAppointmentInterval] = useState(30); // in minutes
  const [minBookingNoticeHours, setMinBookingNoticeHours] = useState(2); // hours before booking
  const [workingHours, setWorkingHours] = useState<Record<string, { enabled: boolean; start: string; end: string }>>({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '14:00' },
    sunday: { enabled: false, start: '09:00', end: '14:00' },
  });

  // 2. Appointment Types & Preparation Instructions
  const [appointmentTypes, setAppointmentTypes] = useState<
    Array<{ code: string; name: string; duration_minutes: number; prep_instructions: string }>
  >([
    { code: 'examination', name: 'Εξέταση / Έλεγχος', duration_minutes: 30, prep_instructions: 'Παρακαλούμε να έχετε μαζί σας προηγούμενες εξετάσεις.' },
    { code: 'cleaning', name: 'Καθαρισμός', duration_minutes: 45, prep_instructions: 'Αποφύγετε την κατανάλωση φαγητού 30 λεπτά πριν το ραντεβού.' },
  ]);

  // 3. AI FAQs Knowledge Base
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string }>>([
    { id: '1', question: 'Πού βρίσκεται η κλινική;', answer: 'Η κλινική βρίσκεται στην οδό Τσιμισκή 45, Θεσσαλονίκη.' },
    { id: '2', question: 'Υπάρχει δυνατότητα πρόσβασης ΑμεΑ;', answer: 'Ναι, η κλινική διαθέτει ράμπα πρόσβασης και ανελκυστήρα.' },
  ]);

  // 4. Urgency Policy & After-Hours Escalation
  const [urgencyPolicy, setUrgentPolicy] = useState(
    'Για οξείς πόνους ή αιμορραγία, η AI Receptionist προτεραιοποιεί άμεσα το ραντεβού ή ειδοποιεί το γιατρό.'
  );
  const [afterHoursEscalation, setAfterHoursEscalation] = useState(
    'Σε κλήσεις εκτός ωραρίου για επείγοντα περιστατικά, αποστέλλεται αυτόματο SMS στο τηλέφωνο ασφαλείας.'
  );

  // Φόρτωση Settings από το API
  useEffect(() => {
    async function fetchSettings() {
      if (!selectedClinic?.id) return;
      try {
        setIsLoading(true);
        const data = await api.getSettings(selectedClinic.id);
        if (data) {
          if (data.name || data.clinic_name) setClinicName(data.name || data.clinic_name);
          if (data.timezone) setTimezone(data.timezone);
          if (data.appointment_interval) setAppointmentInterval(data.appointment_interval);
          if (data.min_booking_notice_hours) setMinBookingNoticeHours(data.min_booking_notice_hours);
          if (data.working_hours) setWorkingHours(data.working_hours);
          if (Array.isArray(data.appointment_types)) setAppointmentTypes(data.appointment_types);
          if (Array.isArray(data.faqs)) setFaqs(data.faqs);
          if (data.urgency_policy) setUrgentPolicy(data.urgency_policy);
          if (data.after_hours_escalation) setAfterHoursEscalation(data.after_hours_escalation);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, [selectedClinic?.id]);

  // Αποθήκευση Ρυθμίσεων
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setSuccessMsg('');
      setErrorMsg('');

      const payload = {
        name: clinicName,
        timezone,
        appointment_interval: appointmentInterval,
        min_booking_notice_hours: minBookingNoticeHours,
        working_hours: workingHours,
        appointment_types: appointmentTypes,
        faqs,
        urgency_policy: urgencyPolicy,
        after_hours_escalation: afterHoursEscalation,
      };

      await api.updateSettings(payload, selectedClinic?.id);
      setSuccessMsg('Οι ρυθμίσεις αποθηκεύτηκαν με επιτυχία!');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setErrorMsg(err?.message || 'Αποτυχία αποθήκευσης ρυθμίσεων.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse max-w-5xl mx-auto">
        <div className="h-8 w-64 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded-xl"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Ρυθμίσεις Κλινικής & AI Receptionist</h1>
          <p className="text-xs text-slate-500 mt-1">
            Διαμορφώστε το ωράριο, τους τύπους ραντεβού, τη γνωσιακή βάση (FAQs) και την πολιτική επειγόντων.
          </p>
        </div>

        <button
          type="button"
          disabled={isActionDisabled || isSaving}
          onClick={handleSaveSettings}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          {isSaving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}
        </button>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 shrink-0 text-emerald-600" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-rose-600" />
          {errorMsg}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'general' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BuildingOfficeIcon className="w-4 h-4" /> Γενικά & Ωράριο
        </button>

        <button
          onClick={() => setActiveTab('appointment_types')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'appointment_types' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarDaysIcon className="w-4 h-4" /> Τύποι Ραντεβού & Prep
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'faqs' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QuestionMarkCircleIcon className="w-4 h-4" /> AI FAQs & Knowledge Base
        </button>

        <button
          onClick={() => setActiveTab('urgency')}
          className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'urgency' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClockIcon className="w-4 h-4" /> Επείγοντα & After-Hours
        </button>
      </div>

      {/* TAB 1: GENERAL & WORKING HOURS */}
      {activeTab === 'general' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Όνομα Κλινικής</label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 bg-slate-50 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ζώνη Ώρας (Timezone)</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 bg-slate-50 focus:bg-white outline-none font-medium"
              >
                <option value="Europe/Athens">Europe/Athens (UTC+2 / UTC+3)</option>
                <option value="Europe/London">Europe/London (UTC+0 / UTC+1)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Βήμα Slot Ραντεβού (σε λεπτά)</label>
              <input
                type="number"
                value={appointmentInterval}
                onChange={(e) => setAppointmentInterval(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 bg-slate-50"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ελάχιστη Προειδοποίηση Κράτησης (ώρες πριν)</label>
              <input
                type="number"
                value={minBookingNoticeHours}
                onChange={(e) => setMinBookingNoticeHours(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-800 bg-slate-50"
              />
            </div>
          </div>

          {/* Working Hours Schedule */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Εβδομαδιαίο Ωράριο Λειτουργίας</h3>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const schedule = workingHours[day.id] || { enabled: false, start: '09:00', end: '17:00' };

                return (
                  <div key={day.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div className="flex items-center gap-3 w-32">
                      <input
                        type="checkbox"
                        checked={schedule.enabled}
                        onChange={(e) =>
                          setWorkingHours({
                            ...workingHours,
                            [day.id]: { ...schedule, enabled: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      />
                      <span className="font-semibold text-slate-700">{day.label}</span>
                    </div>

                    {schedule.enabled ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={schedule.start}
                          onChange={(e) =>
                            setWorkingHours({
                              ...workingHours,
                              [day.id]: { ...schedule, start: e.target.value },
                            })
                          }
                          className="p-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                        <span className="text-slate-400 font-bold">έως</span>
                        <input
                          type="time"
                          value={schedule.end}
                          onChange={(e) =>
                            setWorkingHours({
                              ...workingHours,
                              [day.id]: { ...schedule, end: e.target.value },
                            })
                          }
                          className="p-1.5 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium italic">Κλειστά</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPOINTMENT TYPES & PREPARATION INSTRUCTIONS */}
      {activeTab === 'appointment_types' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="font-bold text-slate-800 text-sm">Τύποι Ραντεβού, Διάρκειες & Οδηγίες Προετοιμασίας</h2>
            <button
              type="button"
              onClick={() =>
                setAppointmentTypes([
                  ...appointmentTypes,
                  { code: `type_${Date.now()}`, name: 'Νέος Τύπος', duration_minutes: 30, prep_instructions: '' },
                ])
              }
              className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-semibold flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" /> Προσθήκη Τύπου
            </button>
          </div>

          <div className="space-y-4">
            {appointmentTypes.map((typeItem, index) => (
              <div key={typeItem.code || index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Όνομα Τύπου Ραντεβού</label>
                      <input
                        type="text"
                        value={typeItem.name}
                        onChange={(e) => {
                          const updated = [...appointmentTypes];
                          updated[index].name = e.target.value;
                          setAppointmentTypes(updated);
                        }}
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Διάρκεια (λεπτά)</label>
                      <input
                        type="number"
                        value={typeItem.duration_minutes}
                        onChange={(e) => {
                          const updated = [...appointmentTypes];
                          updated[index].duration_minutes = Number(e.target.value);
                          setAppointmentTypes(updated);
                        }}
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAppointmentTypes(appointmentTypes.filter((_, i) => i !== index))}
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Οδηγίες Προετοιμασίας Ασθενούς (Η AI θα τις αναφέρει στον ασθενή)
                  </label>
                  <textarea
                    rows={2}
                    value={typeItem.prep_instructions}
                    onChange={(e) => {
                      const updated = [...appointmentTypes];
                      updated[index].prep_instructions = e.target.value;
                      setAppointmentTypes(updated);
                    }}
                    placeholder="π.χ. Να έχετε μαζί σας την αστυνομική σας ταυτότητα."
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AI FAQS KNOWLEDGE BASE */}
      {activeTab === 'faqs' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">AI FAQ Knowledge Base</h2>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Ερωτήσεις και Απαντήσεις που χρησιμοποιεί η AI Receptionist για να απαντά στους ασθενείς.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFaqs([...faqs, { id: String(Date.now()), question: '', answer: '' }])
              }
              className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-semibold flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" /> Προσθήκη FAQ
            </button>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={faq.id || index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Ερώτηση #{index + 1}</label>
                  <button
                    type="button"
                    onClick={() => setFaqs(faqs.filter((_, i) => i !== index))}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={faq.question}
                  placeholder="π.χ. Ποιες πιστωτικές κάρτες δέχεστε;"
                  onChange={(e) => {
                    const updated = [...faqs];
                    updated[index].question = e.target.value;
                    setFaqs(updated);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium"
                />

                <label className="block font-semibold text-slate-600 mt-2">Απάντηση AI</label>
                <textarea
                  rows={2}
                  value={faq.answer}
                  placeholder="π.χ. Δεχόμαστε όλες τις κάρτες Visa, Mastercard καθώς και IRIS."
                  onChange={(e) => {
                    const updated = [...faqs];
                    updated[index].answer = e.target.value;
                    setFaqs(updated);
                  }}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: URGENCY POLICY & AFTER-HOURS ESCALATION */}
      {activeTab === 'urgency' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 text-xs">
          <div>
            <h2 className="font-bold text-slate-800 text-sm mb-1">Πολιτική Επειγόντων & Κλήσεων Εκτός Ωραρίου</h2>
            <p className="text-slate-500">
              Καθορίστε πώς αντιμετωπίζει η AI Receptionist τα επείγοντα ιατρικά περιστατικά.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Πολιτική Επειγόντων Περιστατικών (Urgency Policy)
              </label>
              <textarea
                rows={3}
                value={urgencyPolicy}
                onChange={(e) => setUrgentPolicy(e.target.value)}
                placeholder="Περιγράψτε την οδηγία προς την AI για οξέα περιστατικά..."
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Κανόνες Κλήσεων Εκτός Ωραρίου (After-Hours Escalation)
              </label>
              <textarea
                rows={3}
                value={afterHoursEscalation}
                onChange={(e) => setAfterHoursEscalation(e.target.value)}
                placeholder="Περιγράψτε τη διαδικασία κλιμάκωσης εκτός ωραρίου..."
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}