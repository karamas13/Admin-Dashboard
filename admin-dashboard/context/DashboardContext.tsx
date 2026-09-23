'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';

interface DashboardContextType {
  appointments: any[];
  billing: any[];
  callbacks: any[];
  closures: any[];
  settings: any; 
  loadingTab: string | null;
  callbacksError: string | null;
  fetchAppointments: (force?: boolean) => Promise<void>;
  fetchBilling: (force?: boolean) => Promise<void>;
  fetchCallbacks: (force?: boolean, clinicIdOverride?: string) => Promise<void>;
  updateCallback: (callbackId: string, newStatus: 'pending' | 'completed', notes?: string) => Promise<void>;
  fetchClosures: (force?: boolean, includeHistory?: boolean) => Promise<void>;
  fetchSettings: (force?: boolean) => Promise<void>;
  invalidateCache: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { selectedClinic } = useClinic();
  const clinicId = selectedClinic?.id;

  const [appointments, setAppointments] = useState<any[]>([]);
  const [billing, setBilling] = useState<any[]>([]);
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [closures, setClosures] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [callbacksError, setCallbacksError] = useState<string | null>(null);

  const [fetchedClinics, setFetchedClinics] = useState<{ [key: string]: boolean }>({});
  const [loadingTab, setLoadingTab] = useState<string | null>(null);

  const hasData = useCallback((tab: string) => {
    if (!clinicId) return false;
    return fetchedClinics[`${tab}_${clinicId}`] === true; 
  }, [fetchedClinics, clinicId]);

  const fetchAppointments = useCallback(async (force = false) => {
    if (!clinicId) return;
    if (!force && hasData('appointments')) return;

    try {
      setLoadingTab('appointments');
      const data = await api.getAppointments({ clinicId });
      setAppointments(Array.isArray(data) ? data : data?.appointments || []);
      setFetchedClinics((prev) => ({ ...prev, [`appointments_${clinicId}`]: true }));
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoadingTab(null);
    }
  }, [clinicId, hasData]);

  const fetchBilling = useCallback(async (force = false) => {
    if (!clinicId) return;
    if (!force && hasData('billing')) return;

    try {
      setLoadingTab('billing');
      const data = api.getBilling ? await api.getBilling(clinicId) : []; 
      setBilling(Array.isArray(data) ? data : data?.billing || []);
      setFetchedClinics((prev) => ({ ...prev, [`billing_${clinicId}`]: true }));
    } catch (err) {
      console.error('Failed to fetch billing:', err);
    } finally {
      setLoadingTab(null);
    }
  }, [clinicId, hasData]);

  const fetchCallbacks = useCallback(async (force = false, clinicIdOverride?: string) => {
    const targetClinicId = clinicIdOverride || clinicId;
    if (!targetClinicId) return;
    if (!force && hasData('callbacks')) return;

    try {
      setLoadingTab('callbacks');
      const data = api.getCallbacks ? await api.getCallbacks(undefined, targetClinicId) : [];
      setCallbacks(Array.isArray(data) ? data : data?.callbacks || []);
      setFetchedClinics((prev) => ({ ...prev, [`callbacks_${targetClinicId}`]: true }));
    } catch (err) {
      console.error('Failed to fetch callbacks:', err);
    } finally {
      setLoadingTab(null);
    }
  }, [clinicId, hasData]);

  const updateCallback = useCallback(async (callbackId: string, newStatus: 'pending' | 'completed', notes?: string) => {
    try {
      if (api.updateCallback) {
        await api.updateCallback(callbackId, { status: newStatus, notes });
      }
      setCallbacks((prev) =>
        prev.map((cb) => {
          const id = cb.callback_id || cb.id;
          if (id === callbackId) {
            return { ...cb, status: newStatus, notes: notes !== undefined ? notes : cb.notes };
          }
          return cb;
        })
      );
    } catch (err) {
      console.error('Failed to update callback:', err);
      throw err;
    }
  }, []);

 
  // FETCH CLOSURES / SCHEDULE EXCEPTIONS
  const fetchClosures = useCallback(async (force = false, includeHistory = false) => {
    if (!clinicId) return;
    if (!force && !includeHistory && hasData('closures')) return;

    try {
      setLoadingTab('closures');

      const now = new Date();
      let startAt: string;

      if (includeHistory) {
        // 1 μήνας πίσω
        const pastDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0);
        startAt = pastDate.toISOString();
      } else {
        // Αρχή της σημερινής ημέρας (00:00:00)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        startAt = today.toISOString();
      }

      const endAt = new Date(now.getFullYear(), now.getMonth() + 6, 0, 23, 59, 59).toISOString();

      const data = api.getScheduleExceptions 
        ? await api.getScheduleExceptions({ startsAt: startAt, endsAt: endAt, clinicId })
        : [];

      const rawList: any[] = Array.isArray(data) ? data : data?.closures || data?.schedule_exceptions || [];

      const startThreshold = new Date(startAt).getTime();
      
      const filteredList = rawList.filter((item) => {
        const itemEnd = new Date(item.ends_at || item.starts_at).getTime();
        return itemEnd >= startThreshold;
      });

      setClosures(filteredList);

      if (!includeHistory) {
        setFetchedClinics((prev) => ({ ...prev, [`closures_${clinicId}`]: true }));
      }
    } catch (err) {
      console.error('Failed to fetch closures:', err);
    } finally {
      setLoadingTab(null);
    }

    
  }, [clinicId, hasData]);

  const fetchSettings = useCallback(async (force = false) => {
    if (!clinicId) return;
    if (!force && hasData('settings')) return;

    try {
      setLoadingTab('settings');
      const data = api.getSettings ? await api.getSettings(clinicId) : {};
      setSettings(data || {});
      setFetchedClinics((prev) => ({ ...prev, [`settings_${clinicId}`]: true }));
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoadingTab(null);
    }
  }, [clinicId, hasData]);

  // Αυτόματο triggering όταν αλλάζει η κλινική
  useEffect(() => {
    if (clinicId) {
      fetchCallbacks();
      fetchClosures();
    }
  }, [clinicId, fetchCallbacks, fetchClosures]);

  const invalidateCache = useCallback(() => {
    setFetchedClinics({});
    setSettings(null);
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        appointments,
        billing,
        callbacks,
        closures,
        settings, 
        loadingTab,
        callbacksError,        
        fetchAppointments,
        fetchBilling,
        fetchCallbacks,
        updateCallback,
        fetchClosures,
        fetchSettings, 
        invalidateCache,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}