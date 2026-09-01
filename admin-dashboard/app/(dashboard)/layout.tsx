'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  CalendarIcon, 
  HomeIcon, 
  ClockIcon, 
  PhoneIcon, 
  Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { api, getStoredToken, getStoredClinicId, clearStoredSession } from '@/services/api';

const navItems = [
  { name: 'Επισκόπηση', href: '/', icon: HomeIcon },
  { name: 'Ραντεβού', href: '/appointments', icon: CalendarIcon },
  { name: 'Κλείσιμο Ημερών', href: '/closures', icon: ClockIcon },
  { name: 'Αιτήματα Επικοινωνίας', href: '/callbacks', icon: PhoneIcon },
  { name: 'Ρυθμίσεις', href: '/settings', icon: Cog6ToothIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('Φόρτωση...');
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    async function checkAuth() {
      const token = getStoredToken();
      const currentClinicId = getStoredClinicId();
      
      if (!token) {
        router.push('/login');
        return;
      }

      if (currentClinicId) {
        setClinicId(currentClinicId);
      }

      // Φόρτωση email από τα αποθηκευμένα στοιχεία χρήστη
      const savedUser = localStorage.getItem('user_data');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser?.email) {
            setUserEmail(parsedUser.email);
          }
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      }

      try {
        const session = await api.getSession(currentClinicId || undefined);
        if (!session.success) {
          clearStoredSession();
          router.push('/login');
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        clearStoredSession();
        router.push('/login');
      }
    }

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    api.logout();
  };

  const currentTitle = 
    pathname === '/' ? 'Επισκόπηση' :
    pathname === '/appointments' ? 'Ραντεβού' :
    pathname === '/closures' ? 'Κλείσιμο Ημερών' :
    pathname === '/callbacks' ? 'Αιτήματα Επικοινωνίας' :
    pathname === '/settings' ? 'Ρυθμίσεις' : 'Dashboard';

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans antialiased overflow-hidden flex-col md:flex-row">
        
      {/* 1. Mobile Top Header (Εμφανίζεται μόνο σε κινητά/tablets) */}
      <div className="md:hidden bg-[#0b1329] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            <span>🫁</span>
          </div>
          <span className="text-sm font-semibold">Medical Clinic</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-800/80"
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
        </button>
      </div>

      {/* 2. Mobile Backdrop / Overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* 3. Sidebar Container */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-[#0b1329] text-slate-300 flex flex-col justify-between border-r border-slate-800
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Clinic Brand Area */}
          <div className="p-6 flex items-center justify-between border-b border-slate-800/55">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                <span>🫁</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Medical Dashboard</h2>
                <p className="text-xs text-slate-500">Κλινική Διαχείριση</p>
              </div>
            </div>
            {/* Close button για mobile drawer */}
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-blue-600/15 text-blue-400 border-l-4 border-blue-500 pl-3' 
                      : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Account / Footer Area */}
        <div className="p-4 border-t border-slate-800/50 space-y-2">
          <div className="flex items-center gap-3 p-2">
            <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 uppercase">
              {userEmail.charAt(0)}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{userEmail}</p>
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span> Συνδεδεμένος
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 rounded-md transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-4 h-4" />
            Αποσύνδεση
          </button>
        </div>
      </aside>

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Navbar Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              {currentTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Top Bar Status / Info */}
            {clinicId && (
              <span className="bg-slate-100 text-slate-600 rounded-lg text-xs px-2.5 py-1.5 font-mono">
                ID: {clinicId.substring(0, 8)}...
              </span>
            )}
            <button className="relative p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 border border-slate-200 rounded-full shrink-0">
              <BellIcon className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}