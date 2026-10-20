'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getStoredToken } from '@/services/api';
import { 
  LockClosedIcon, 
  EnvelopeIcon, 
  ExclamationTriangleIcon,
  BuildingOffice2Icon,
  ArrowRightIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (!email.trim() || !password.trim()) {
      setError('Παρακαλώ συμπληρώστε όλα τα πεδία.');
      return;
    }

    try {
      setIsLoading(true);

      const res = await api.login(email, password);
      console.log('API Login Response:', res);
      
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
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#090D16] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#101622] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-200/40 dark:shadow-none p-6 sm:p-8 space-y-6 backdrop-blur-xs">
        
        {/* Header / Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-xs mb-1">
            <BuildingOffice2Icon className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Καλώς ήρθατε
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Συνδεθείτε στον πίνακα διαχείρισης της επιχείρησής σας
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div 
            role="alert" 
            className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs rounded-2xl flex items-start gap-3 shadow-xs"
          >
            <ExclamationTriangleIcon className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <EnvelopeIcon className="w-5 h-5" />
              </div>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.gr"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-2xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Κωδικός Πρόσβασης
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <LockClosedIcon className="w-5 h-5" />
              </div>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label={showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin text-white" />
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

        <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/80">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Administrator Dashboard &copy; 2026
          </p>
        </div>

      </div>
    </div>
  );
}