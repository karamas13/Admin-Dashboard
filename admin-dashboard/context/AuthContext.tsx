// src/context/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  clinicId: string | null;
  user: any | null;
  setSession: (token: string, clinicId: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    // Φόρτωση session από LocalStorage κατά το αρχικό load
    const savedToken = localStorage.getItem('auth_token');
    const savedClinicId = localStorage.getItem('clinic_id');
    const savedUser = localStorage.getItem('user_data');

    if (savedToken && savedClinicId) {
      setToken(savedToken);
      setClinicId(savedClinicId);
      if (savedUser) setUser(JSON.parse(savedUser));
    }
  }, []);

  const setSession = (newToken: string, newClinicId: string, newUser: any) => {
    setToken(newToken);
    setClinicId(newClinicId);
    setUser(newUser);

    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('clinic_id', newClinicId);
    localStorage.setItem('user_data', JSON.stringify(newUser));
    document.cookie = `auth_token=${newToken}; path=/; max-age=86400; SameSite=Lax`;
  };

  const logout = () => {
    setToken(null);
    setClinicId(null);
    setUser(null);

    localStorage.removeItem('auth_token');
    localStorage.removeItem('clinic_id');
    localStorage.removeItem('user_data');
    document.cookie = 'auth_token=; path=/; max-age=0;';
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ token, clinicId, user, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}