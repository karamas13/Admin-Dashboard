'use client';

import React from 'react';
import { useClinic } from '@/context/ClinicContext';

export default function ClinicSwitcher() {
  const { clinics, selectedClinic, setSelectedClinic, isLoading } = useClinic();

  if (isLoading || !selectedClinic) {
    return (
      <div className="h-9 w-44 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg" />
    );
  }

  // Single-clinic users: Απλό badge χωρίς dropdown (με υποστήριξη light/dark mode)
  if (clinics.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white dark:bg-blue-600 dark:text-white rounded-lg shadow-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span className="truncate max-w-50">{selectedClinic.name}</span>
      </div>
    );
  }

  // Multi-clinic users: Dropdown επιλογής (πλήρως προσαρμοσμένο σε light & dark mode)
  return (
    <div className="relative inline-block w-full sm:w-auto">
      <select
        value={selectedClinic.id}
        onChange={(e) => {
          const targetClinic = clinics.find((c) => c.id === e.target.value);
          if (targetClinic) {
            setSelectedClinic(targetClinic);
          }
        }}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-8 py-1.5 cursor-pointer font-medium shadow-sm transition-all"
      >
        {clinics.map((clinic) => (
          <option 
            key={clinic.id} 
            value={clinic.id}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {clinic.name} ({clinic.role || 'staff'})
          </option>
        ))}
      </select>

      {/* Chevron Icon με σωστή αντίθεση ανάλογα με το mode */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
  );
}