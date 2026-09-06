'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '@/services/api';

export type ClinicStatus = 'active' | 'suspended' | 'closed';

export interface Clinic {
  id: string;
  name: string;
  role?: string;
  status?: ClinicStatus;
  status_reason?: string | null;
  is_default?: boolean;
  is_owner?: boolean;
  [key: string]: any;
}

interface ClinicContextType {
  clinics: Clinic[];
  selectedClinic: Clinic | null;
  setSelectedClinic: (clinic: Clinic) => Promise<void>;
  isOwner: boolean;
  isActive: boolean;
  isSuspended: boolean;
  isReadOnly: boolean;
  isClosed: boolean;
  isLoading: boolean;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinicState] = useState<Clinic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Ασφαλής Υπολογισμός Ρόλου (ελέγχει role, user_role, membership_role & is_owner flag)
  const userRole = (
    selectedClinic?.role ||
    selectedClinic?.user_role ||
    selectedClinic?.membership_role ||
    ''
  ).toLowerCase();

  const isOwner =
    userRole === 'owner' ||
    userRole === 'admin' ||
    userRole === 'clinic_owner' ||
    selectedClinic?.is_owner === true;

  // 2. Υπολογισμός Καταστάσεων Lifecycle
  const status = (selectedClinic?.status as ClinicStatus) || 'active';
  const isActive = status === 'active';
  const isSuspended = status === 'suspended';
  const isReadOnly = isSuspended; // Suspended σημαίνει Read-Only
  const isClosed = status === 'closed';

  // 3. Φόρτωση Session
  useEffect(() => {
    async function loadSessionAndClinics() {
      try {
        setIsLoading(true);
        const data = await apiFetch<any>('/api/dashboard/session', { method: 'GET' });

        if (data?.success && Array.isArray(data.clinics)) {
          const userClinics: Clinic[] = data.clinics.map((c: any) => {
            // Διατηρούμε ΟΛΑ τα πεδία που στέλνει το backend (...c)
            // και εξασφαλίζουμε ότι ο ρόλος δεν χάνεται.
            const extractedRole = c.role || c.user_role || c.membership_role || data.role || data.user_role;
            
            return {
              ...c, // Spread για να μην χάνεται καμία ιδιότητα του backend
              id: c.id,
              name: c.name,
              role: extractedRole || 'staff',
              status: c.status || 'active',
              status_reason: c.status_reason || null,
              is_default: c.is_default || false,
            };
          });

          setClinics(userClinics);

          const savedClinicId = localStorage.getItem('selected_clinic_id');
          const targetId = savedClinicId || data.selected_clinic_id;

          const matchedClinic = userClinics.find((c) => c.id === targetId);
          const activeClinic = matchedClinic || userClinics[0];

          if (activeClinic) {
            setSelectedClinicState(activeClinic);
            localStorage.setItem('selected_clinic_id', activeClinic.id);
            localStorage.setItem('clinic_id', activeClinic.id);
            document.cookie = `clinic_id=${activeClinic.id}; path=/; max-age=86400; SameSite=Lax`;
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

  // 4. Εναλλαγή Κλινικής (Switch Clinic)
  const setSelectedClinic = async (clinic: Clinic) => {
    try {
      setIsLoading(true);
      setSelectedClinicState(clinic);

      localStorage.setItem('selected_clinic_id', clinic.id);
      localStorage.setItem('clinic_id', clinic.id);
      document.cookie = `clinic_id=${clinic.id}; path=/; max-age=86400; SameSite=Lax`;

      await apiFetch('/api/dashboard/session', { method: 'GET' }, clinic.id);

      window.location.reload();
    } catch (err) {
      console.error('Failed to switch clinic:', err);
      setIsLoading(false);
    }
  };

  return (
    <ClinicContext.Provider
      value={{
        clinics,
        selectedClinic,
        setSelectedClinic,
        isOwner,
        isActive,
        isSuspended,
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