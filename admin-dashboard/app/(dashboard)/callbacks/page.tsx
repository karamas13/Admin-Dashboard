'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';
import { CallbackRequest } from '@/types';

export default function CallbacksPage() {
  const [callbacks, setCallbacks] = useState<CallbackRequest[]>([]);

  useEffect(() => {
    async function loadCallbacks() {
      try {
        const data = await apiFetch.get<{ success: boolean; callbacks: CallbackRequest[] }>('/api/dashboard/callbacks');
        if (data.success) setCallbacks(data.callbacks);
      } catch (err) {
        console.error(err);
      }
    }
    loadCallbacks();
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Εκκρεμή Αιτήματα Επικοινωνίας (Callbacks)</h2>
      <div className="space-y-2">
        {callbacks.length > 0 ? callbacks.map(cb => (
          <div key={cb.callback_id} className="p-4 border border-slate-100 rounded-lg flex justify-between items-center hover:bg-slate-50/50 transition-colors">
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-800">{cb.caller_name} — <span className="text-slate-500 font-medium">{cb.phone}</span></p>
              <p className="text-slate-600"><strong>Λόγος:</strong> {cb.reason}</p>
            </div>
            <button className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white transition-colors text-[11px] font-semibold text-slate-600 rounded-md">
              Μαρκάρισμα ως Ολοκληρωμένο
            </button>
          </div>
        )) : (
          <p className="text-xs text-slate-400 text-center py-6">Όλα τα αιτήματα επικοινωνίας έχουν διεκπεραιωθεί!</p>
        )}
      </div>
    </div>
  );
}