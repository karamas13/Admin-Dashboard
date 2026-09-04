'use client';

import React from 'react';
import { useClinic } from '@/context/ClinicContext';

export function ClinicSwitcher() {
  const { clinics, selectedClinic, setSelectedClinic } = useClinic();

  if (clinics.length <= 1) return null;

  return (
    <div className="relative inline-block text-left">
      <select
        value={selectedClinic?.id || ''}
        onChange={(e) => {
          const found = clinics.find(c => c.id === e.target.value);
          if (found) setSelectedClinic(found);
        }}
        className="bg-slate-800 text-white text-sm font-medium rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {clinics.map((clinic) => (
          <option key={clinic.id} value={clinic.id}>
            {clinic.name} ({clinic.role})
          </option>
        ))}
      </select>
    </div>
  );
}