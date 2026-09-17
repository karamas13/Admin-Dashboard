'use client';

import React, { useState } from 'react';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';

interface CreateAppointmentModalProps {
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAppointmentModal({
  initialDate = '',
  initialTime = '09:00',
  onClose,
  onSuccess,
}: CreateAppointmentModalProps) {
  const { selectedClinic } = useClinic();
  const [callerName, setCallerName] = useState('');
  const [phone, setPhone] = useState('');
  const [appointmentType, setAppointmentType] = useState('examination');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialTime);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ starts_at: string; ends_at: string }>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvailabilityError(null);
    setSuggestions([]);

    if (!date || !time) return;

    try {
      setIsSubmitting(true);
      const startsAtISO = new Date(`${date}T${time}:00`).toISOString();

      // 1. Έλεγχος Διαθεσιμότητας
      try {
        const checkRes = await api.checkAvailability(
          { starts_at: startsAtISO, duration_minutes: durationMinutes },
          selectedClinic?.id
        );

        if (checkRes && checkRes.available === false) {
          setAvailabilityError(checkRes.reason || 'Η επιλεγμένη ώρα δεν είναι διαθέσιμη.');
          if (Array.isArray(checkRes.suggestions)) {
            setSuggestions(checkRes.suggestions);
          }
          setIsSubmitting(false);
          return;
        }
      } catch (checkErr) {
        // Αν αποτύχει ο έλεγχος διαθεσιμότητας, προχωράμε στο create appointment
        console.warn('Availability check skipped:', checkErr);
      }

      // 2. Δημιουργία Ραντεβού
      const payload = {
        clinic_id: selectedClinic?.id,
        caller_name: callerName,
        phone: phone,
        appointment_type_code: appointmentType,
        start_at: startsAtISO,
        duration_minutes: durationMinutes,
        status: 'booked',
      };

      await api.createAppointment(payload, selectedClinic?.id);
      onSuccess();
    } catch (err: any) {
      console.error('Error creating appointment:', err);
      setAvailabilityError(err?.message || 'Σφάλμα κατά τη δημιουργία του ραντεβού.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSuggestion = (isoString: string) => {
    const suggestedDate = new Date(isoString);
    const dateStr = suggestedDate.toISOString().split('T')[0];
    const hours = String(suggestedDate.getHours()).padStart(2, '0');
    const minutes = String(suggestedDate.getMinutes()).padStart(2, '0');

    setDate(dateStr);
    setTime(`${hours}:${minutes}`);
    setAvailabilityError(null);
    setSuggestions([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-base font-bold text-slate-800">Νέο Ραντεβού</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        {availabilityError && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl space-y-2">
            <p className="font-semibold">⚠️ {availabilityError}</p>
            {suggestions.length > 0 && (
              <div>
                <p className="font-medium text-amber-900 mb-1">Προτεινόμενες εναλλακτικές ώρες:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((sug, i) => {
                    const d = new Date(sug.starts_at);
                    const timeLabel = d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug.starts_at)}
                        className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold transition-colors"
                      >
                        {timeLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ονοματεπώνυμο Ασθενή</label>
            <input
              type="text"
              required
              value={callerName}
              onChange={(e) => setCallerName(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Τηλέφωνο Επικοινωνίας</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Τύπος Ραντεβού</label>
            <select
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium"
            >
              <option value="examination">Εξέταση / Έλεγχος</option>
              <option value="cleaning">Καθαρισμός</option>
              <option value="treatment">Θεραπεία</option>
              <option value="consultation">Συμβουλευτική</option>
              <option value="emergency">Έκτακτο</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ημερομηνία</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ώρα</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
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
  );
}