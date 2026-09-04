'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '@/services/api';

export type ClinicStatus = 'active' | 'suspended' | 'closed';
export type UserRole = 'owner' | 'staff';

export interface Clinic {
  id: string;
  name: string;
  role?: string; // 'owner' | 'staff'
  status?: ClinicStatus;
  is_default?: boolean;
  [key: string]: any;
}

interface ClinicContextType {
  clinics: Clinic[];
  selectedClinic: Clinic | null;
  setSelectedClinic: (clinic: Clinic) => void;
  isOwner: boolean;
  isReadOnly: boolean;
  isClosed: boolean;
  isLoading: boolean;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinicState] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Υπολογισμός Ρόλου & Καταστάσεων
  const userRole = (selectedClinic?.role || '').toLowerCase();
  const isOwner = userRole === 'owner' || userRole === 'admin' || userRole === 'clinic_owner';
  const isReadOnly = selectedClinic?.status === 'suspended';
  const isClosed = selectedClinic?.status === 'closed';

  // 2. Φόρτωση Session & Κλινικών από το Backend
  useEffect(() => {
  async function loadSessionAndClinics() {
    try {
      setIsLoading(true);

      // Καλούμε το session χωρίς να επιβάλλουμε κανένα X-Clinic-Id header,
      // ώστε το backend να επιστρέψει τις κλινικές του συνδεδεμένου χρήστη
      const data = await apiFetch<any>('/api/dashboard/session', { method: 'GET' });

      if (data?.success && Array.isArray(data.clinics)) {
        const userClinics: Clinic[] = data.clinics.map((c: any) => ({
          id: c.id,
          name: c.name,
          role: c.role || 'staff',
          status: c.status || 'active',
          is_default: c.is_default || false,
        }));

        setClinics(userClinics);

        const savedClinicId = localStorage.getItem('selected_clinic_id');
        const targetId = savedClinicId || data.selected_clinic_id;
        
        const matchedClinic = userClinics.find((c) => c.id === targetId);
        const activeClinic = matchedClinic || userClinics[0];

        if (activeClinic) {
          setSelectedClinicState(activeClinic);
          localStorage.setItem('selected_clinic_id', activeClinic.id);
          localStorage.setItem('clinic_id', activeClinic.id);
        }
      }
    } catch (err) {
      console.error('Failed to load session/clinics:', err);
    } finally {
      setIsLoading(false);
    }
  }

  loadSessionAndClinics();
}, []);

  // Log για επιβεβαίωση στο Console
  useEffect(() => {
    if (selectedClinic) {
      console.log('🔍 Active Clinic:', selectedClinic.name);
      console.log('👤 Role from API:', selectedClinic.role, '| IsOwner:', isOwner);
    }
  }, [selectedClinic, isOwner]);

  const setSelectedClinic = (clinic: Clinic) => {
    setSelectedClinicState(clinic);
    localStorage.setItem('selected_clinic_id', clinic.id);
  };

  return (
    <ClinicContext.Provider
      value={{
        clinics,
        selectedClinic,
        setSelectedClinic,
        isOwner,
        isReadOnly,
        isClosed,
        isLoading,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
}