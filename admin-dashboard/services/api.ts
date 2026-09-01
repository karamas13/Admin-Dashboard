'use client'
// src/services/api.ts

const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
const DEFAULT_CLINIC_ID = process.env.NEXT_PUBLIC_SUPABASE_CLINIC_ID; 
const BASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const getStoredClinicId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('clinic_id');
};

export const setStoredSession = async (token: string, clinicId?: string, user?: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
    if (user) localStorage.setItem('user_data', JSON.stringify(user));

    document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;

    if (clinicId) {
      localStorage.setItem('clinic_id', clinicId);
      document.cookie = `clinic_id=${clinicId}; path=/; max-age=86400; SameSite=Lax`;
    }
  }
};



export const clearStoredSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('clinic_id');
    localStorage.removeItem('user_data');
    document.cookie = 'auth_token=; path=/; max-age=0;';
    document.cookie = 'clinic_id=; path=/; max-age=0;';
  }
};

async function apiFetch<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  customClinicId?: string
): Promise<T> {
  const clinicId = customClinicId || getStoredClinicId();
  const token = getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(SUPABASE_ANON_KEY && { 'apikey': SUPABASE_ANON_KEY }),
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (clinicId) headers['x-clinic-id'] = clinicId;

  // Αν το endpoint είναι εσωτερικό route του Next.js (/api/...), καλείται στο ίδιο domain
  // Αλλιώς, αν είναι Supabase auth, στέλνεται στο BASE_URL
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : endpoint.startsWith('/api/') 
      ? endpoint 
      : `${BASE_URL}${endpoint}`;

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error_description || 
      errorData.message_el || 
      errorData.message || 
      errorData.error || 
      'Αποτυχία Σύνδεσης.'
    );
  }

  return response.json();
}

export const api = {
  
  // 1. AUTHENTICATION
  login: async (email: string, password: string) => {
    // Αίτημα στο Supabase Auth
    const response = await apiFetch<any>('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = response?.access_token;
    const user = response?.user;

    if (token) {
      // 1. Προσωρινή αποθήκευση του token
      await setStoredSession(token, undefined, user);

      try {
        // 2. Ρωτάμε το Next.js API σε ποιο clinic ανήκει ο χρήστης
        const sessionRes = await apiFetch<{ success: boolean; selected_clinic_id: string }>(
          '/api/dashboard/session',
          { method: 'GET' }
        );

        if (sessionRes?.selected_clinic_id) {
          // 3. Αποθηκεύουμε το ΣΩΣΤΟ clinic_id
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
    return apiFetch<{ success: boolean; selected_clinic_id: string }>(
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

    // Υποστήριξη είτε object είτε μεμονωμένων παραμέτρων
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

    // Προσθήκη μόνο αν η τιμή είναι έγκυρη ημερομηνία (και όχι UUID clinic_id)
    if (startAt && !startAt.includes('-') === false) queryParams.append('start_at', startAt);
    if (endAt && !endAt.includes('-') === false) queryParams.append('end_at', endAt);
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

  // Δημιουργία νέου ραντεβού
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

    // Το API επιστρέφει { schedule_exceptions: [...] }
    // Κάνουμε extract τη λίστα και φιλτράρουμε μόνο τα κλεισίματα (closed)
    const list = Array.isArray(data) ? data : (data?.schedule_exceptions || []);
    
    return list.filter((item: any) => item.availability_effect === 'closed');
  },

  createClosure: async (payload: any, clinicId?: string) => {
    // Εξασφαλίζουμε ότι το payload περιλαμβάνει τα απαιτούμενα πεδία του νέου API
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

    // Το API επιστρέφει { schedule_exception: { ... } }
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