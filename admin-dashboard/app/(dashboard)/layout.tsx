// src/app/(dashboard)/layout.tsx

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/services/api';
import { 
  CalendarIcon, 
  HomeIcon, 
  ClockIcon, 
  PhoneIcon, 
  Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

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
  const [userEmail, setUserEmail] = useState<string>('Παναγιώτης');

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Αν δεν υπάρχει session, ανακατεύθυνση στο login (ή χρήση Mock για την ώρα)
        // router.push('/login');
      } else {
        setUserEmail(session.user.email || 'Χρήστης Κλινικής');
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    localStorage.removeItem('mock_session');
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans antialiased">
        
      {/* Sidebar Container */}
      <aside className="w-64 bg-[#0b1329] text-slate-300 flex flex-col justify-between border-r border-slate-800">
        <div>
          {/* Clinic Brand Area */}
          <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              <span>🫁</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Test Clinic</h2>
              <p className="text-xs text-slate-500">Θεσσαλονίκη</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
            <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
              Π
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
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-400 rounded-md transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-4 h-4" />
            Αποσύνδεση
          </button>
        </div>
      </aside>

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-10">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {pathname === '/' && 'Επισκόπηση'}
              {pathname === '/appointments' && 'Ραντεβού'}
              {pathname === '/closures' && 'Κλείσιμο Ημερών'}
              {pathname === '/callbacks' && 'Αιτήματα Επικοινωνίας'}
              {pathname === '/settings' && 'Ρυθμίσεις'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Top Bar Clinic Selector */}
            <select className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-1.5 font-medium text-slate-700 outline-none focus:border-blue-500">
              <option value="ff24346e-22da-40a5-a2c6-a792258b9c2a">Test Clinic</option>
            </select>
            <button className="relative p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 border border-slate-200 rounded-full">
              <BellIcon className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}