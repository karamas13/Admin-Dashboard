'use client'

const rawProjectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || '';
const SUPABASE_PROJECT_REF = rawProjectRef.replace(/['";\s]/g, '');

const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/['";\s]/g, ''); 
const DEFAULT_CLINIC_ID = process.env.NEXT_PUBLIC_SUPABASE_CLINIC_ID; 

// Base URL για το Supabase
const BASE_URL = SUPABASE_PROJECT_REF ? `https://${SUPABASE_PROJECT_REF}.supabase.co` : '';

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  // 1. Υπολογισμός του clinicId:
  // Αν το endpoint είναι το /api/dashboard/session και ΔΕΝ έχουμε ρητό override,
  // ΔΕΝ στέλνουμε X-Clinic-Id header για να μην φάμε 403 Forbidden!
  let clinicId: string | null = null;
  
  if (clinicIdOverride !== undefined) {
    clinicId = clinicIdOverride;
  } else if (!endpoint.includes('/api/dashboard/session')) {
    clinicId = typeof window !== 'undefined' 
      ? (localStorage.getItem('selected_clinic_id') || localStorage.getItem('clinic_id')) 
      : null;
  }

  // 2. Έλεγχος Δρομολόγησης URL
  let fullUrl = endpoint;
  if (!endpoint.startsWith('http')) {
    if (endpoint.startsWith('/auth/v1')) {
      fullUrl = `${BASE_URL}${endpoint}`;
    } else {
      fullUrl = endpoint; 
    }
  }

  // 3. Κατασκευή Headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(endpoint.startsWith('/auth/v1') && SUPABASE_ANON_KEY ? { 'apikey': SUPABASE_ANON_KEY } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(clinicId ? { 'X-Clinic-Id': clinicId } : {}),
    ...options.headers,
  };

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      clearStoredSession();
      window.location.href = '/login';
    }
    throw new Error('Session expired');
  }

  if (response.status === 403) {
    throw new Error('Δεν έχετε δικαίωμα πρόσβασης για αυτή την ενέργεια.');
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error(`Non-JSON response from ${fullUrl}:`, text);
    throw new Error(`Invalid response from server (${response.status}). Expected JSON.`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
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
        const sessionRes = await apiFetch<{ success: boolean; selected_clinic_id: string; clinics: any[] }>(
          '/api/dashboard/session',
          { method: 'GET' }
        );

        if (sessionRes?.selected_clinic_id) {
          await setStoredSession(token, sessionRes.selected_clinic_id, user);
        }
      } catch (err) {
        console.warn('⚠️ Δεν ήταν δυνατή η αυτόματη ανάκτηση του clinic_id:', err);
      }
    }

    return response;
  },

  logout: async () => {
    clearStoredSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  // 2. SESSION & CLINIC CONTEXT
  getSession: async (clinicId?: string) => {
    return apiFetch<{
      success: boolean;
      user: { id: string; email: string };
      clinics: Array<{
        id: string;
        name: string;
        status: string;
        role: string;
        is_default: boolean;
      }>;
      selected_clinic_id: string;
    }>(
      '/api/dashboard/session',
      { method: 'GET' },
      clinicId
    );
  },

  // 3. APPOINTMENTS
  getAppointments: async (paramsObj?: { startAt?: string; endAt?: string; clinicId?: string } | string, endAtParam?: string, clinicIdParam?: string) => {
    let startAt: string | undefined;
    let endAt: string | undefined;
    let clinicId: string | undefined;

    if (typeof paramsObj === 'object' && paramsObj !== null) {
      startAt = paramsObj.startAt;
      endAt = paramsObj.endAt;
      clinicId = paramsObj.clinicId;
    } else {
      startAt = paramsObj;
      endAt = endAtParam;
      clinicId = clinicIdParam;
    }

    const activeClinicId = clinicId || getStoredClinicId();
    const queryParams = new URLSearchParams();

    if (startAt && startAt.includes('-')) queryParams.append('start_at', startAt);
    if (endAt && endAt.includes('-')) queryParams.append('end_at', endAt);
    if (activeClinicId) queryParams.append('clinic_id', activeClinicId);

    const queryString = queryParams.toString();
    const endpoint = `/api/dashboard/appointments${queryString ? `?${queryString}` : ''}`;

    return apiFetch<any>(endpoint, { method: 'GET' }, activeClinicId || undefined);
  },

  rescheduleAppointment: async (appointmentId: string, payload: any, clinicId?: string) => {
    return apiFetch<any>(`/api/dashboard/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, clinicId);
  },

  createAppointment: async (payload: any) => {
    const activeClinicId = payload?.clinic_id || getStoredClinicId();

    return apiFetch<any>(
      '/api/dashboard/appointments',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          clinic_id: activeClinicId,
        }),
      },
      activeClinicId || undefined
    );
  },

  cancelAppointment: async (appointmentId: string, clinicId?: string) => {
    return apiFetch<any>(`/api/dashboard/appointments/${appointmentId}/cancel`, {
      method: 'POST',
    }, clinicId);
  },

  // 4. SETTINGS & CLOSURES
  getSettings: async (clinicId?: string) => {
    return apiFetch<any>('/api/dashboard/settings', { method: 'GET' }, clinicId);
  },

  getClosures: async (startsAt?: string, endsAt?: string, clinicId?: string) => {
    const params = new URLSearchParams();
    if (startsAt) params.append('starts_at', startsAt);
    if (endsAt) params.append('ends_at', endsAt);

    const data = await apiFetch<any>(`/api/dashboard/schedule-exceptions?${params.toString()}`, { method: 'GET' }, clinicId);
    const list = Array.isArray(data) ? data : (data?.schedule_exceptions || []);
    
    return list.filter((item: any) => item.availability_effect === 'closed');
  },

  createClosure: async (payload: any, clinicId?: string) => {
    const formattedPayload = {
      starts_at: payload.starts_at || payload.startsAt,
      ends_at: payload.ends_at || payload.endsAt,
      availability_effect: 'closed',
      reason_code: payload.reason_code || payload.reasonCode || 'closed',
      active: payload.active !== undefined ? payload.active : true,
      ...payload
    };

    const response = await apiFetch<any>('/api/dashboard/schedule-exceptions', {
      method: 'POST',
      body: JSON.stringify(formattedPayload),
    }, clinicId);

    return response?.schedule_exception || response;
  },

  deleteClosure: async (schedule_exception_id: string, clinicId?: string) => {
    return apiFetch<any>(`/api/dashboard/schedule-exceptions/${schedule_exception_id}`, { method: 'DELETE' }, clinicId);
  },

  // 5. CALLBACKS
  getCallbacks: async (status?: string, clinicId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    return apiFetch<any>(`/api/dashboard/callbacks?${params.toString()}`, { method: 'GET' }, clinicId);
  },

  updateCallbackStatus: async (callbackId: string, status: string, clinicId?: string) => {
    return apiFetch<any>(`/api/dashboard/callbacks/${callbackId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, clinicId);
  },
};