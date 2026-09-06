'use client';

import React from 'react';
import { useClinic } from '@/context/ClinicContext';

export default function ClinicStatusBanner() {
  const { selectedClinic, isSuspended } = useClinic();

  if (!isSuspended || !selectedClinic) return null;

  // Μετάφραση γνωστών αιτιών σε φιλικά μηνύματα
  const getReasonMessage = (reason?: string | null) => {
    switch (reason) {
      case 'billing_period_missing':
        case 'payment_failed':
        return 'Υπάρχει εκκρεμότητα με τη συνδρομή ή την περίοδο χρέωσης.';
      case 'terms_violation':
        return 'Η πρόσβαση ανεστάλη λόγω παραβίασης όρων χρήσης.';
      default:
        return 'Η πρόσβαση έχει ανασταλεί προσωρινά.';
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-6 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
          <div>
            <span className="font-bold">Η κλινική βρίσκεται σε κατάσταση αναστολής (Suspended).</span>{' '}
            <span className="text-amber-800">{getReasonMessage(selectedClinic.status_reason)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-md border border-amber-300">
            Read-Only Mode
          </span>
          <span className="text-xs text-amber-700">
            (Οι αλλαγές και η επεξεργασία δεδομένων έχουν απενεργοποιηθεί)
          </span>
        </div>
      </div>
    </div>
  );
}