'use client';

import React from 'react';

export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-800">Καλώς ορίσατε στο Κέντρο Ελέγχου</h2>
        <p className="text-xs text-slate-500 mt-1">Εδώ βλέπετε μια γρήγορη επισκόπηση των σημερινών ενεργειών της AI Receptionist.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">Πρόσφατες Αλλαγές</h3>
          <div className="mt-3 text-xs space-y-3 text-slate-600">
            <p>🔴 <strong>Το ραντεβού ακυρώθηκε</strong> - Άννα Μαρκοπούλου <span className="text-[10px] text-slate-400">(Σήμερα, 07:50)</span></p>
            <p>🔄 <strong>Ραντεβού αναπρογραμματίστηκε</strong> - Νίκος Δημητρίου <span className="text-[10px] text-slate-400">(Χθες, 16:30)</span></p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">Google Sync Status</h3>
            <p className="text-xs text-slate-600 mt-3">✅ Όλα εντάξει. Τελευταίος συγχρονισμός: <strong>19/06/2026, 08:30</strong></p>
          </div>
          <button className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 rounded-lg transition-colors">
            Συγχρονισμός τώρα
          </button>
        </div>
      </div>
    </div>
  );
}