'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdOutlineApps } from "react-icons/md";


export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Mock Authentication Validation
    setTimeout(() => {
      if (email === 'admin@testclinic.gr' && password === 'admin123') {
        // Αποθήκευση εικονικού login στην προσωρινή μνήμη του browser
        localStorage.setItem('mock_session', JSON.stringify({ email, isLoggedIn: true }));
        
        // Ανακατεύθυνση στο Dashboard
        router.push('/');
      } else {
        setError('Μη έγκυρο email ή κωδικός πρόσβασης. Δοκιμάστε admin@testclinic.gr / admin123');
        setIsLoading(false);
      }
    }, 800); // Μια μικρή καθυστέρηση για ρεαλιστικό εφέ φόρτωσης
  };

  return (
    <div className="min-h-screen bg-[#0b1329] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header με το Branding */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
            <MdOutlineApps className='text-white text-5xl'/>
          </div>
          <h1 className="text-xl font-bold text-slate-900">AI Receptionist</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">Καλώς ορίσατε στο Production Admin Panel</p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Email Διεύθυνση
            </label>
            <input
              type="email"
              required
              placeholder="π.χ. admin@testclinic.gr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-slate-800 bg-slate-50/50"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Κωδικός Πρόσβασης
              </label>
              <a href="#" className="text-xs font-semibold text-blue-600 hover:underline">
                Ξέχασες τον κωδικό;
              </a>
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-slate-800 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label id="remember" className="text-xs font-medium text-slate-600 select-none">
              Να με θυμάσαι σε αυτή τη συσκευή
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Σύνδεση σε εξέλιξη...
              </>
            ) : (
              'Είσοδος στο Σύστημα'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] font-medium text-slate-400">
            Δοκιμαστικά Credentials: <span className="font-bold text-slate-600">admin@testclinic.gr</span> / <span className="font-bold text-slate-600">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}