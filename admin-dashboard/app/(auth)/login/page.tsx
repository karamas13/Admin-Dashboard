'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getStoredToken } from '@/services/api';
import { 
  LockClosedIcon, 
  EnvelopeIcon, 
  ExclamationCircleIcon,
  BuildingOffice2Icon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Αν ο χρήστης είναι ήδη συνδεδεμένος, ανακατεύθυνση στο Dashboard
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Παρακαλώ συμπληρώστε όλα τα πεδία.');
      return;
    }

    try {
      setIsLoading(true);

      const res = await api.login(email, password);
        console.log('API Login Response:', res);
      // Έλεγχος αν επιστράφηκε valid token
      const token = res?.session?.access_token || res?.token || res?.access_token;

      if (token) {
        // Hard Redirect ώστε να αναγνωριστεί άμεσα το νέο cookie από το Next.js Middleware
        window.location.href = '/';
      } else {
        setError(res?.error || res?.message || 'Αποτυχία αυθεντικοποίησης. Ελέγξτε τα στοιχεία σας.');
      }

    } catch (err: any) {
      console.error('❌ Σφάλμα κατά τη σύνδεση:', err);
      setError(err?.message || 'Αποτυχία σύνδεσης. Ελέγξτε τα στοιχεία σας.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6">
        
        {/* Header / Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 mb-2">
            <BuildingOffice2Icon className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Καλώς ήρθατε
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Συνδεθείτε στον πίνακα διαχείρισης της κλινικής σας
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
            <ExclamationCircleIcon className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <EnvelopeIcon className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.gr"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Κωδικός Πρόσβασης
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <LockClosedIcon className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Σύνδεση...</span>
              </>
            ) : (
              <>
                <span>Σύνδεση</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            AI Clinic Receptionist Dashboard &copy; 2026
          </p>
        </div>

      </div>
    </div>
  );
}