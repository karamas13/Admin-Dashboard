'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { useClinic } from '@/context/ClinicContext';

interface DashboardContextType {
  appointments: any[];
  billing: any;
  callbacks: any[];
  closures: any[];
  settings: any;
  updates: any[];
  notificationPreferences: any;
  loadingTab: string | null;
  callbacksError: string | null;
  fetchAppointments: (params?: { startAt?: string; endAt?: string; force?: boolean }) => Promise<void>;
  fetchBilling: (force?: boolean) => Promise<void>;
  fetchCallbacks: (force?: boolean, clinicIdOverride?: string) => Promise<void>;
  updateCallback: (callbackId: string, newStatus: 'pending' | 'completed' | 'resolved', notes?: string) => Promise<void>;
  addCallbackNote: (callbackId: string, content: string) => Promise<any>;
  fetchClosures: (force?: boolean, includeHistory?: boolean) => Promise<void>;
  fetchSettings: (force?: boolean) => Promise<void>;  
  invalidateCache: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { selectedClinic } = useClinic();
  const clinicId = selectedClinic?.id;

  const [appointments, setAppointments] = useState<any[]>([]);
  const [billing, setBilling] = useState<any>(null);
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [closures, setClosures] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<any>(null);
  const [callbacksError, setCallbacksError] = useState<string | null>(null);
  const [loadingTab, setLoadingTab] = useState<string | null>(null);

  // Χρήση useRef αντί για useState για το cache, ώστε να μην αλλάζουν τα references των συναρτήσεων
  const fetchedClinicsRef = useRef<{ [key: string]: boolean }>({});
  const fetchingRef = useRef<{ [key: string]: boolean }>({});

  const hasData = useCallback((tab: string) => {
    if (!clinicId) return false;
    return fetchedClinicsRef.current[`${tab}_${clinicId}`] === true;
  }, [clinicId]);

  const fetchAppointments = useCallback(async (params?: { startAt?: string; endAt?: string; force?: boolean }) => {
    if (!clinicId) return;
    const force = params?.force ?? false;
    const lockKey = `appointments_${clinicId}`;
    
    if (fetchingRef.current[lockKey] && !force) return;
    if (!force && hasData('appointments') && !params?.startAt) return;

    try {
      fetchingRef.current[lockKey] = true;
      setLoadingTab('appointments');
      
      const apiParams: any = { clinicId };
      if (params?.startAt) apiParams.startAt = params.startAt;
      if (params?.endAt) apiParams.endAt = params.endAt;

      const data = await api.getAppointments(apiParams);
      setAppointments(Array.isArray(data) ? data : data?.appointments || []);
      fetchedClinicsRef.current[`appointments_${clinicId}`] = true;
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      fetchingRef.current[lockKey] = false;
      setLoadingTab(null);
    }
  }, [clinicId, hasData]);

  const fetchBilling = useCallback(async (force = false) => {
    if (!clinicId) return;
    const lockKey = `billing_${clinicId}`;
    if (fetchingRef.current[lockKey]) return;
    if (!force && hasData('billing')) return;

    try {
      fetchingRef.current[lockKey] = true;
      setLoadingTab('billing');
      const data = await api.getBilling(clinicId);
      setBilling(data);
      fetchedClinicsRef.current[`billing_${clinicId}`] = true;
    } catch (err) {
      console.error('Failed to fetch billing:', err);
    } finally {
      fetchingRef.current[lockKey] = false;
      setLoadingTab(null);
    }
  }, [clinicId, hasData]);

  const fetchCallbacks = useCallback(async (force = false, clinicIdOverride?: string) => {
    const targetClinicId = clinicIdOverride || clinicId;
    if (!targetClinicId) return;
    const lockKey = `callbacks_${targetClinicId}`;
    if (fetchingRef.current[lockKey]) return;
    if (!force && hasData('callbacks') && !clinicIdOverride) return;

    try {
      fetchingRef.current[lockKey] = true;
      setLoadingTab('callbacks');
      setCallbacksError(null);
      const data = await api.getCallbacks(undefined, 100, 0, targetClinicId);
      const list = Array.isArray(data) ? data : data?.callbacks || data?.data || [];
      setCallbacks(list);
      fetchedClinicsRef.current[`callbacks_${targetClinicId}`] = true;
    } catch (err: any) {
      console.error('Failed to fetch callbacks:', err);
      setCallbacksError(err.message || 'Αποτυχία φόρτωσης αιτημάτων');
    } finally {
      fetchingRef.current[lockKey] = false;
      setLoadingTab(null);
    }
  }, [clinicId, hasData]);

  const updateCallback = useCallback(async (callbackId: string, newStatus: 'pending' | 'completed' | 'resolved', notes?: string) => {
    try {
      const payload: any = { status: newStatus };
      if (notes !== undefined) {
        payload.notes = notes;
        payload.work_summary = notes;
      }
      await api.updateCallback(callbackId, payload, clinicId);
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
  }, [clinicId]);

  const addCallbackNote = useCallback(async (callbackId: string, content: string) => {
    try {
      const res = await api.addCallbackNote(callbackId, { content }, clinicId);
      setCallbacks((prev) =>
        prev.map((cb) => {
          const id = cb.callback_id || cb.id;
          if (id === callbackId) {
            return { ...cb, notes: content, work_summary: content };
          }
          return cb;
        })
      );
      return res;
    } catch (err) {
      console.error('Failed to add callback note:', err);
      throw err;
    }
  }, [clinicId]);

  const fetchClosures = useCallback(async (force = false, includeHistory = false) => {
    if (!clinicId) return;
    const lockKey = `closures_${clinicId}`;
    if (fetchingRef.current[lockKey]) return;
    if (!force && !includeHistory && hasData('closures')) return;

    try {
      fetchingRef.current[lockKey] = true;
      setLoadingTab('closures');
      const now = new Date();
      let startAt: string;

      if (includeHistory) {
        startAt = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
      } else {
        startAt = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      }
      const endAt = new Date(now.getFullYear(), now.getMonth() + 6, 0, 23, 59, 59).toISOString();

      const data = await api.getScheduleExceptions({ startsAt: startAt, endsAt: endAt, clinicId });
      const rawList: any[] = Array.isArray(data) ? data : data?.schedule_exceptions || data?.closures || [];

      setClosures(rawList);
      if (!includeHistory) {
        fetchedClinicsRef.current[`closures_${clinicId}`] = true;
      }
    } catch (err) {
      console.error('Failed to fetch closures:', err);
    } finally {
      fetchingRef.current[lockKey] = false;
      setLoadingTab(null);
    }
  }, [clinicId, hasData]);

  const fetchSettings = useCallback(async (force = false) => {
    if (!clinicId) return;
    const lockKey = `settings_${clinicId}`;
    if (fetchingRef.current[lockKey]) return;
    if (!force && hasData('settings')) return;

    try {
      fetchingRef.current[lockKey] = true;
      setLoadingTab('settings');
      const data = await api.getSettings(clinicId);
      setSettings(data || {});
      fetchedClinicsRef.current[`settings_${clinicId}`] = true;
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      fetchingRef.current[lockKey] = false;
      setLoadingTab(null);
    }
  }, [clinicId, hasData]);

  const invalidateCache = useCallback(() => {
    fetchedClinicsRef.current = {};
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
        updates,
        notificationPreferences,
        loadingTab,
        callbacksError,
        fetchAppointments,
        fetchBilling,
        fetchCallbacks,
        updateCallback,
        addCallbackNote,
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