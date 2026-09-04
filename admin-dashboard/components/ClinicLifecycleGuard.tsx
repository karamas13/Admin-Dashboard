'use client';

import React from 'react';
import { useClinic } from '@/context/ClinicContext';

export function ClinicLifecycleGuard({ children }: { children: React.ReactNode }) {
  const { isReadOnly, isClosed, isLoading, selectedClinic } = useClinic();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Φόρτωση δεδομένων κλινικής...</div>;
  }

  if (isClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            ✕
          </div>
          <h1 className="text-2xl font-bold">Πρόσβαση Μπλοκαρισμένη</h1>
          <p className="text-slate-400">
            Η πρόσβαση στο dashboard της κλινικής <strong>{selectedClinic?.name}</strong> έχει τερματιστεί οριστικά λόγω διακοπής της συνεργασίας.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isReadOnly && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-sm font-semibold text-center shadow-md flex items-center justify-center gap-2">
          <span>⚠️ Η κλινική βρίσκεται σε αναστολή (Suspended). Το dashboard είναι σε λειτουργία ανάγνωσης μόνο (Read-Only).</span>
        </div>
      )}
      {children}
    </div>
  );
}