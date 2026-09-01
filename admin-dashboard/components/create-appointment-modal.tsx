'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface CreateAppointmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: string; // Format: "YYYY-MM-DD"
  initialTime?: string; // Format: "HH:mm"
}

export default function CreateAppointmentModal({ 
  onClose, 
  onSuccess, 
  initialDate, 
  initialTime 
}: CreateAppointmentModalProps) {
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialTime || '10:00');
  const [callerName, setCallerName] = useState('');
  const [phone, setPhone] = useState('');
  const [appointmentType, setAppointmentType] = useState('cleaning');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
    if (initialTime) setTime(initialTime);
  }, [initialDate, initialTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // Κατασκευή ISO String με ρητό +03:00 Offset όπως ζητάει το Backend
      const formattedStartAt = `${date}T${time}:00+03:00`;

      // Payload βασισμένο 100% στο Postman Collection
      const payload = {
        caller_name: callerName,
        phone: phone,
        callback_phone: phone,
        appointment_type_code: appointmentType,
        urgency_code: 'normal',
        start_at: formattedStartAt,
        duration_minutes: 30,
      };

      await api.createAppointment(payload);
      onSuccess();
    } catch (err: any) {
      console.error('Create appointment error:', err);
      setErrorMsg(err.message || 'Αποτυχία δημιουργίας ραντεβού');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Νέο Ραντεβού</h2>
          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-md">
            📅 {date} | 🕒 {time}
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Όνομα Πελάτη</label>
            <input 
              type="text" 
              value={callerName} 
              onChange={(e) => setCallerName(e.target.value)} 
              placeholder="π.χ. Γιώργος Παπαδόπουλος"
              className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ημερομηνία</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ώρα</label>
              <input 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)} 
                className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Τηλέφωνο</label>
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="+306912345678"
              className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Τύπος Ραντεβού</label>
            <select 
              value={appointmentType} 
              onChange={(e) => setAppointmentType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="cleaning">Καθαρισμός (cleaning)</option>
              <option value="checkup">Εξέταση (checkup)</option>
              <option value="consultation">Συμβουλευτική (consultation)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Ακύρωση
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Αποθήκευση...' : 'Δημιουργία'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}