'use client';

import React from 'react';
import { useClinic } from '@/context/ClinicContext';

export default function ClosedClinicGuard({ children }: { children: React.ReactNode }) {
  const { selectedClinic, isClosed } = useClinic();

  if (isClosed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Η κλινική είναι κλειστή (Closed)
          </h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Η πρόσβαση στο dashboard της κλινικής <span className="font-semibold text-gray-800">{selectedClinic?.name}</span> έχει διακοπεί οριστικά.
          </p>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
            Αν πιστεύετε ότι πρόκειται για λάθος, επικοινωνήστε με την υποστήριξη.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}