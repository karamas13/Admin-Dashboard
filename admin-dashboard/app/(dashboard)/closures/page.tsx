'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';
import { Closure } from '@/types';

export default function ClosuresPage() {
  const [closures, setClosures] = useState<Closure[]>([]);

  useEffect(() => {
    async function loadClosures() {
      try {
        const data = await apiFetch.get<{ success: boolean; closures: Closure[] }>('/api/dashboard/closures?start_at=2026-07-01T00:00:00.000Z&end_at=2026-07-31T23:59:59.999Z');
        if (data.success) setClosures(data.closures);
      } catch (err) {
        console.error(err);
      }
    }
    loadClosures();
  }, []);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Κλείσιμο Ημερών & Αργίες</h2>
          <p className="text-xs text-slate-500">Ορίστε χρονικά διαστήματα κατά τα οποία η AI Receptionist δεν θα επιτρέπει κρατήσεις.</p>
        </div>
        <button className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm">+ Προσθήκη Αργίας</button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <th className="p-3">Αιτιολογία</th>
              <th className="p-3">Έναρξη</th>
              <th className="p-3">Λήξη</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {closures.length > 0 ? closures.map(c => (
              <tr key={c.closure_id} className="hover:bg-slate-50/50">
                <td className="p-3 font-medium uppercase">{c.reason_code}</td>
                <td className="p-3">{new Date(c.starts_at).toLocaleString('el-GR')}</td>
                <td className="p-3">{new Date(c.ends_at).toLocaleString('el-GR')}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="p-4 text-center text-slate-400">Δεν έχουν καταχωρηθεί κλειστές ημέρες για το επιλεγμένο διάστημα.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}