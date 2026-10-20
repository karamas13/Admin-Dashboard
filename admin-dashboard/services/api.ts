'use client';

const rawProjectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || '';
const SUPABASE_PROJECT_REF = rawProjectRef.replace(/['";\s]/g, '');
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/['";\s]/g, '');
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || (SUPABASE_PROJECT_REF ? `https://${SUPABASE_PROJECT_REF}.supabase.co` : '');

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const getStoredClinicId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('selected_clinic_id') || localStorage.getItem('clinic_id');
};

export const setStoredSession = async (token: string, clinicId?: string, user?: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
    if (user) localStorage.setItem('user_data', JSON.stringify(user));
    document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;

    if (clinicId) {
      localStorage.setItem('clinic_id', clinicId);
      localStorage.setItem('selected_clinic_id', clinicId);
      document.cookie = `clinic_id=${clinicId}; path=/; max-age=86400; SameSite=Lax`;
    }
  }
};

export const clearStoredSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('clinic_id');
    localStorage.removeItem('selected_clinic_id');
    localStorage.removeItem('user_data');
    document.cookie = 'auth_token=; path=/; max-age=0;';
    document.cookie = 'clinic_id=; path=/; max-age=0;';
  }
};

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  clinicIdOverride?: string
): Promise<T> {
  const token = getStoredToken();
  let clinicId: string | null = null;

  if (clinicIdOverride !== undefined) {
    clinicId = clinicIdOverride;
  } else if (!endpoint.includes('/api/dashboard/session')) {
    clinicId = getStoredClinicId();
  }

  let fullUrl = endpoint;
  if (!endpoint.startsWith('http')) {
    if (endpoint.startsWith('/auth/v1')) {
      fullUrl = `${BASE_URL}${endpoint}`;
    } else {
      fullUrl = endpoint;
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(endpoint.startsWith('/auth/v1') && SUPABASE_ANON_KEY ? { 'apikey': SUPABASE_ANON_KEY } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(clinicId ? { 'X-Clinic-Id': clinicId } : {}),
    ...options.headers,
  };

  const response = await fetch(fullUrl, { ...options, headers });

  if (response.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      clearStoredSession();
      window.location.href = '/login';
    }
    throw new Error('Η συνεδρία έληξε. Παρακαλώ συνδεθείτε ξανά.');
  }

  if (response.status === 403) {
    throw new Error('Δεν έχετε δικαίωμα πρόσβασης για αυτή την ενέργεια.');
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`Non-JSON response from ${fullUrl}:`, text);
    throw new Error(`Μη έγκυρη απάντηση από τον διακομιστή (${response.status}).`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Σφάλμα API: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // 1. AUTHENTICATION
  login: async (email: string, password: string) => {
    const response = await apiFetch<any>('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = response?.access_token;
    const user = response?.user;

    if (token) {
      await setStoredSession(token, undefined, user);
      try {
        const sessionRes = await apiFetch<{ success: boolean; selected_clinic_id: string }>(
          '/api/dashboard/session',
          { method: 'GET' }
        );
        if (sessionRes?.selected_clinic_id) {
          await setStoredSession(token, sessionRes.selected_clinic_id, user);
        }
      } catch (err) {
        console.warn('Αδυναμία αυτόματης ανάκτησης clinic_id:', err);
      }
    }
    return response;
  },

  logout: async () => {
    clearStoredSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
  },

  // 2. SESSION & CLINICS
  getSession: async (clinicId?: string) => {
    return apiFetch<{
      success: boolean;
      user: { id: string; email: string };
      clinics: Array<{ id: string; name: string; status: string; role: string; is_default: boolean }>;
      selected_clinic_id: string;
    }>('/api/dashboard/session', { method: 'GET' }, clinicId);
  },

  // 3. APPOINTMENTS
  getAppointments: async (params?: { startAt?: string; endAt?: string; limit?: number; offset?: number; clinicId?: string }) => {
    const activeClinicId = params?.clinicId || getStoredClinicId();
    const query = new URLSearchParams();
    if (params?.startAt) query.append('start_at', params.startAt);
    if (params?.endAt) query.append('end_at', params.endAt);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const endpoint = `/api/dashboard/appointments${query.toString() ? `?${query.toString()}` : ''}`;
    return apiFetch<any>(endpoint, { method: 'GET' }, activeClinicId || undefined);
  },

  getAvailableSlots: async (startDate: string, days = 7, durationMinutes = 30, appointmentId?: string, clinicId?: string) => {
    const activeClinicId = clinicId || getStoredClinicId();
    const query = new URLSearchParams({
      start_date: startDate,
      days: String(days),
      duration_minutes: String(durationMinutes),
    });
    if (appointmentId) query.append('appointment_id', appointmentId);

    return apiFetch<any>(`/api/dashboard/appointments/available-slots?${query.toString()}`, { method: 'GET' }, activeClinicId || undefined);
  },

  checkAvailability: async (startAt: string, durationMinutes = 30, clinicId?: string) => {
    const activeClinicId = clinicId || getStoredClinicId();
    return apiFetch<any>('/api/dashboard/appointments/availability', {
      method: 'POST',
      body: JSON.stringify({ start_at: startAt, duration_minutes: durationMinutes }),
    }, activeClinicId || undefined);
  },

  createAppointment: async (payload: {
    caller_name: string;
    phone: string;
    callback_phone?: string;
    appointment_type_code: string;
    urgency_code?: string;
    start_at: string;
    duration_minutes?: number;
  }, clinicId?: string) => {
    const activeClinicId = clinicId || getStoredClinicId();
    return apiFetch<any>('/api/dashboard/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, activeClinicId || undefined);
  },

  getAppointmentById: async (appointmentId: string, clinicId?: string) => {
    return apiFetch<any>(`/api/dashboard/appointments/${appointmentId}`, { method: 'GET' }, clinicId);
  },

  rescheduleAppointment: async (appointmentId: string, payload: { start_at: string; duration_minutes?: number }, clinicId?: string) => {
    return apiFetch<any>(`/api/dashboard/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, clinicId);
  },

  cancelAppointment: async (appointmentId: string, clinicId?: string) => {
    return apiFetch<any>(`/api/dashboard/appointments/${appointmentId}/cancel`, { method: 'POST' }, clinicId);
  },

  // 4. SCHEDULE EXCEPTIONS (CLOSURES & EXTRA HOURS)
  getScheduleExceptions: async (params?: { startsAt?: string; endsAt?: string; limit?: number; offset?: number; clinicId?: string }) => {
    const activeClinicId = params?.clinicId || getStoredClinicId();
    const query = new URLSearchParams();
    if (params?.startsAt) query.append('starts_at', params.startsAt);
    if (params?.endsAt) query.append('ends_at', params.endsAt);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.offset) query.append('offset', String(params.offset));

    const endpoint = `/api/dashboard/schedule-exceptions${query.toString() ? `?${query.toString()}` : ''}`;
    return apiFetch<any>(endpoint, { method: 'GET' }, activeClinicId || undefined);
  },

  createScheduleException: async (payload: {
    starts_at: string;
    ends_at: string;
    availability_effect: 'closed' | 'open';
    reason_code: string;
    active?: boolean;
  }, clinicId?: string) => {
    const activeClinicId = clinicId || getStoredClinicId();
    return apiFetch<any>('/api/dashboard/schedule-exceptions', {
      method: 'POST',
      body: JSON.stringify({ active: true, ...payload }),
    }, activeClinicId || undefined);
  },

  deleteScheduleException: async (exceptionId: string, clinicId?: string) => {
    return apiFetch<any>(`/api/dashboard/schedule-exceptions/${exceptionId}`, { method: 'DELETE' }, clinicId);
  },

 // CALLBACKS & NOTES
  getCallbacks: async (status?: string, limit = 100, offset = 0, clinicId?: string) => {
    const activeClinicId = clinicId || getStoredClinicId();
    const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (status !== undefined) query.append('status', status);

    return apiFetch<any>(`/api/dashboard/callbacks?${query.toString()}`, { method: 'GET' }, activeClinicId || undefined);
  },

  updateCallback: async (callbackId: string, payload: { status?: string; notes?: string; work_summary?: string }, clinicId?: string) => {
    const activeClinicId = clinicId || getStoredClinicId();
    return apiFetch<any>(`/api/dashboard/callbacks/${callbackId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, activeClinicId || undefined);
  },

  // Note management mapped to the proper core callback patch/get endpoints
  getCallbackNotes: async (callbackId: string, clinicId?: string) => {
    const activeClinicId = clinicId || getStoredClinicId();
    const res = await apiFetch<any>(`/api/dashboard/callbacks/${callbackId}`, { method: 'GET' }, activeClinicId || undefined);
    const cb = res?.callback || res;
    
    // Return structured notes array if present
    if (cb?.notes) {
      return [{ id: '1', content: cb.notes, created_at: cb.updated_at || cb.created_at, author_name: 'Σημείωση Κλινικής' }];
    }
    return [];
  },

  addCallbackNote: async (callbackId: string, payload: { content: string }, clinicId?: string) => {
    const activeClinicId = clinicId || getStoredClinicId();
    // Persist the note cleanly onto the core callback record via PATCH
    return apiFetch<any>(`/api/dashboard/callbacks/${callbackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ 
        notes: payload.content,
        work_summary: payload.content 
      }),
    }, activeClinicId || undefined);
  },

  // 6. SETTINGS & NOTIFICATION PREFERENCES
  getSettings: async (clinicId?: string) => {
    return apiFetch<any>('/api/dashboard/settings', { method: 'GET' }, clinicId);
  },

  updateSettings: async (payload: any, clinicId?: string) => {
    return apiFetch<any>('/api/dashboard/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, clinicId);
  },

  getNotificationPreferences: async (clinicId?: string) => {
    return apiFetch<any>('/api/dashboard/notification-preferences', { method: 'GET' }, clinicId);
  },

  updateNotificationPreferences: async (payload: { urgent_alerts?: boolean; regular_callbacks?: boolean; new_bookings?: boolean }, clinicId?: string) => {
    return apiFetch<any>('/api/dashboard/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, clinicId);
  },

  // 7. BILLING
  getBilling: async (clinicId?: string, periodId?: string) => {
    const activeClinicId = clinicId || getStoredClinicId();
    const endpoint = periodId ? `/api/dashboard/billing-periods/${periodId}` : '/api/dashboard/billing-periods?limit=12&offset=0';
    return apiFetch<any>(endpoint, { method: 'GET' }, activeClinicId || undefined);
  },


  
};