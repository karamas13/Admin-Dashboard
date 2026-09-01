'use client';

import React, { useState } from 'react';
import { Appointment } from '@/types';
import { api } from '@/services/api';

interface PanelProps {
  appointment: Appointment;
  onClose: () => void;
  onStateChange: () => void;
}

// Map για μετάφραση των τύπων ραντεβού στα Ελληνικά
const appointmentTypeMap: Record<string, string> = {
  cleaning: 'Καθαρισμός',
  checkup: 'Εξέταση / Έλεγχος',
  consultation: 'Συμβουλευτική',
  general: 'Γενικό Ραντεβού',
};

export default function AppointmentDetailsPanel({ appointment, onClose, onStateChange }: PanelProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  // Fallbacks για ανάκτηση τηλεφώνου με βάση το Schema της βάσης
  const phone =
    (appointment as any).phone_normalized ||
    (appointment as any).callback_phone_normalized ||
    appointment.phone ||
    (appointment as any).callback_phone ||
    '-';

  // Fallbacks για ανάκτηση ονόματος
  const callerName =
    appointment.caller_name ||
    (appointment as any).patient_name ||
    (appointment as any).patient?.name ||
    (appointment as any).summary ||
    'Ανώνυμος Ασθενής';

  // Μετάφραση του τύπου ραντεβού
  const appointmentType =
    appointmentTypeMap[appointment.appointment_type_code] ||
    appointment.appointment_type_code ||
    'Γενικό Ραντεβού';

  const handleCancel = async () => {
    if (confirm('Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτό το ραντεβού;')) {
      try {
        setIsCancelling(true);
        const data = await api.cancelAppointment(appointment.appointment_id);

        if (data.success) {
          onStateChange();
          onClose();
        }
      } catch (err) {
        console.error('Σφάλμα κατά την ακύρωση του ραντεβού:', err);
        alert('Η ακύρωση απέτυχε. Παρακαλώ δοκιμάστε ξανά.');
      } finally {
        setIsCancelling(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between animate-slide-in">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Λεπτομέρειες Ραντεβού</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 font-bold"
              disabled={isCancelling}
            >
              ✕
            </button>
          </div>

          <div className="mt-6 space-y-4 text-sm">
            <div>
              <label className="text-xs font-semibold text-slate-400 block uppercase">
                Ονοματεπώνυμο
              </label>
              <p className="text-sm font-bold text-slate-800 mt-1">{callerName}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block uppercase">
                Τηλέφωνο Επικοινωνίας
              </label>
              <p className="text-sm font-medium text-slate-700 mt-1">{phone}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block uppercase">
                Τύπος Ραντεβού
              </label>
              <p className="text-sm font-medium text-slate-700 mt-1">{appointmentType}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block uppercase">
                Ημερομηνία & Ώρα
              </label>
              <p className="text-sm font-medium text-slate-700 mt-1">
                {new Date(appointment.start_at).toLocaleString('el-GR')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-full bg-rose-50 hover:bg-rose-100 disabled:bg-slate-50 disabled:text-slate-400 text-rose-600 font-semibold py-2 rounded-lg text-xs border border-rose-200 disabled:border-slate-200 transition-colors"
          >
            {isCancelling ? 'Ακύρωση σε εξέλιξη...' : 'Ακύρωση Ραντεβού'}
          </button>
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg text-xs transition-colors"
          >
            Κλείσιμο
          </button>
        </div>
      </div>
    </div>
  );
}