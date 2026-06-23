'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/services/api';

export default function CreateAppointmentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('cleaning');
  const [date, setDate] = useState('2026-07-02');
  const [time, setTime] = useState('10:00');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiFetch.post('/api/dashboard/appointments', {
        caller_name: name,
        appointment_type_code: type,
        urgency_code: 'normal',
        phone: phone,
        start_at: `${date}T${time}:00+03:00`,
        duration_minutes: 30
      });
      onSuccess();
    } catch (err) {
      alert('Σφάλμα κατά την αποθήκευση, παρακαλώ ελέγξτε τη διαθεσιμότητα.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Χειροκίνητη Καταχώρηση Ραντεβού</h3>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Όνομα Ασθενούς</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Κινητό Τηλέφωνο</label>
            <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ημερομηνία</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ώρα</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg">Ακύρωση</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm">
              {loading ? 'Αποθήκευση...' : 'Επιβεβαίωση'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}