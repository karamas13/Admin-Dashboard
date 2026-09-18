'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  CalendarIcon, 
  HomeIcon, 
  ClockIcon, 
  PhoneIcon, 
  Cog6ToothIcon, 
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { ClinicProvider, useClinic } from '@/context/ClinicContext';
import { ClinicLifecycleGuard } from '@/components/ClinicLifecycleGuard';
import ClinicSwitcher from '@/components/ClinicSwitcher';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

function InnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { selectedClinic, isOwner } = useClinic();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const userEmail = user?.email || 'Χρήστης';

  const navItems = [
    { name: 'Επισκόπηση', href: '/', icon: HomeIcon, ownerOnly: false },
    { name: 'Ραντεβού', href: '/appointments', icon: CalendarIcon, ownerOnly: false },
    { name: 'Εξαιρέσεις Ωραρίου', href: '/closures', icon: ClockIcon, ownerOnly: false },
    { name: 'Αιτήματα Επικοινωνίας', href: '/callbacks', icon: PhoneIcon, ownerOnly: false },
    ...(isOwner ? [
      { name: 'Ρυθμίσεις', href: '/settings', icon: Cog6ToothIcon, ownerOnly: true },
      { name: 'Χρέωση & Λεπτά', href: '/billing', icon: CreditCardIcon, ownerOnly: true },
    ] : []),
  ];

  const currentTitle = 
    pathname === '/' ? 'Επισκόπηση' :
    pathname === '/appointments' ? 'Ραντεβού' :
    pathname === '/closures' ? 'Εξαιρέσεις Ωραρίου' :
    pathname === '/callbacks' ? 'Αιτήματα Επικοινωνίας' :
    pathname === '/settings' ? 'Ρυθμίσεις' :
    pathname === '/billing' ? 'Χρέωση & Χρήση' : 'Dashboard';

  return (
    <div className="flex h-screen bg-[#f2f6fc] dark:bg-slate-950 font-sans antialiased overflow-hidden flex-col md:flex-row">
        
      {/* 1. Mobile Top Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 flex items-center justify-between border-b border-blue-100 dark:border-slate-800 shrink-0 z-30 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
            <span>🫁</span>
          </div>
          <span className="text-sm font-semibold truncate max-w-37.5">
            {selectedClinic?.name || 'Medical Clinic'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ClinicSwitcher />
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg bg-blue-50 dark:bg-slate-800 transition-colors"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* 2. Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* 3. Sidebar Container (Soft blue in light mode) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex flex-col justify-between border-r border-blue-100 dark:border-slate-800
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          <div className="p-6 flex items-center justify-between border-b border-blue-100 dark:border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                <span>🫁</span>
              </div>
              <div className="truncate">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {selectedClinic?.name || 'Medical Dashboard'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  Ρόλος: {selectedClinic?.role || 'Staff'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

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
                      ? 'bg-blue-50 dark:bg-blue-600/15 text-blue-700 dark:text-blue-400 border-l-4 border-blue-600 pl-3' 
                      : 'hover:bg-blue-50/60 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-blue-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-3 p-2">
            <div className="w-9 h-9 bg-blue-100 dark:bg-slate-700 text-blue-800 dark:text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 uppercase">
              {userEmail.charAt(0)}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{userEmail}</p>
              <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span> Συνδεδεμένος
              </span>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-4 h-4" />
            Αποσύνδεση
          </button>
        </div>
      </aside>

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden w-full bg-[#f2f6fc] dark:bg-slate-950 transition-colors">
        {/* Top Navbar Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-blue-100 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between shadow-xs z-10 shrink-0 transition-colors">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {currentTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Theme Toggle Component */}
            <ThemeToggle />

            {/* Multi-Clinic Selector στην επιφάνεια εργασίας */}
            <div className="hidden md:block">
              <ClinicSwitcher />
            </div>

          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f2f6fc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
          <ClinicLifecycleGuard>
            {children}
          </ClinicLifecycleGuard>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClinicProvider>
      <InnerDashboardLayout>
        {children}
      </InnerDashboardLayout>
    </ClinicProvider>
  );
}