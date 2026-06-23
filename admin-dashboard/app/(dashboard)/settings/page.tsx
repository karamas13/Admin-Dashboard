'use client';

import React, { useState } from 'react';

export default function SettingsPage() {
  const [clinicName, setClinicName] = useState('Test Clinic');
  const [sync, setSync] = useState(true);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 max-w-3xl">
      <div>
        <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Ρυθμίσεις Κλινικής & AI Γνωσιακή Βάση</h2>
      </div>

      <div className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Όνομα Κλινικής</label>
          <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} className="w-full max-w-md border border-slate-200 rounded-lg p-2 text-sm outline-none" />
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Google Calendar Integration</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sync} onChange={e => setSync(e.target.checked)} className="rounded text-blue-600" />
            <span className="font-medium text-slate-600">Ενεργοποίηση αμφίδρομου συγχρονισμού ραντεβού</span>
          </label>
        </div>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h3 className="text-sm font-bold text-slate-700">AI FAQ Knowledge Base (Ερωτήσεις - Απαντήσεις για το Bot)</h3>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
            <p className="font-bold text-slate-800">Ερώτηση: "Πού βρίσκεται η κλινική;"</p>
            <p className="text-slate-600">Απάντηση: "Η κλινική βρίσκεται στην οδό Τσιμισκή, Θεσσαλονίκη."</p>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button type="button" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm">
            Αποθήκευση Αλλαγών
          </button>
        </div>
      </div>
    </div>
  );
}