import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8787';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_URL = 'http://localhost:8787';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token || ''}`,
    'X-Clinic-Id': localStorage.getItem('dashboard_clinic_id') || 'ff24346e-22da-40a5-a2c6-a792258b9c2a'
  };
}

export const apiFetch = {
  async get<T>(path: string): Promise<T> {
    const headers = await getAuthHeader();
    const res = await fetch(`${BASE_URL}${path}`, { method: 'GET', headers });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  async post<T>(path: string, body: any): Promise<T> {
    const headers = await getAuthHeader();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok && res.status !== 409) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  async patch<T>(path: string, body: any): Promise<T> {
    const headers = await getAuthHeader();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  async delete<T>(path: string): Promise<T> {
    const headers = await getAuthHeader();
    const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }
};