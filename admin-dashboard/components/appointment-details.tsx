'use client';

import React from 'react';
import { Appointment } from '@/types';
import { apiFetch } from '@/services/api';

interface PanelProps {
  appointment: Appointment;
  onClose: () => void;
  onStateChange: () => void;
}

export default function AppointmentDetailsPanel({ appointment, onClose, onStateChange }: PanelProps) {
  
  const handleCancel = async () => {
    if (confirm('Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτό το ραντεβού;')) {
      await apiFetch.post(`/api/dashboard/appointments/${appointment.appointment_id}/cancel`, {});
      onStateChange();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between animate-slide-in">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Λεπτομέρειες Ραντεβού</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>

          <div className="mt-6 space-y-4 text-sm">
            <div>
              <label className="text-xs font-semibold text-slate-400 block uppercase">Ονοματεπώνυμο</label>
              <p className="text-sm font-bold text-slate-800 mt-1">{appointment.caller_name}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block uppercase">Τηλέφωνο Επικοινωνίας</label>
              <p className="text-sm font-medium text-slate-700 mt-1">{appointment.phone}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block uppercase">Τύπος Ραντεβού</label>
              <p className="text-sm font-medium text-slate-700 mt-1">{appointment.appointment_type_code}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block uppercase">Ημερομηνία & Ώρα</label>
              <p className="text-sm font-medium text-slate-700 mt-1">{new Date(appointment.start_at).toLocaleString('el-GR')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <button 
            onClick={handleCancel}
            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-2 rounded-lg text-xs border border-rose-200 transition-colors"
          >
            Ακύρωση Ραντεβού
          </button>
          <button 
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg text-xs transition-colors"
          >
            Κλείσιμο
          </button>
        </div>
      </div>
    </div>
  );
}