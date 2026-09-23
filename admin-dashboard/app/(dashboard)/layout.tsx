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
  CreditCardIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { ClinicProvider, useClinic } from '@/context/ClinicContext';
import { DashboardProvider } from '@/context/DashboardContext';
import { ClinicLifecycleGuard } from '@/components/ClinicLifecycleGuard';
import ClinicSwitcher from '@/components/ClinicSwitcher';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

function InnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { selectedClinic, isOwner } = useClinic();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const userEmail = user?.email || 'Χρήστης';

  const navItems = [
    { name: 'Επισκόπηση', href: '/', icon: HomeIcon },
    { name: 'Ραντεβού', href: '/appointments', icon: CalendarIcon },
    { name: 'Εξαιρέσεις Ωραρίου', href: '/closures', icon: ClockIcon },
    { name: 'Αιτήματα Επικοινωνίας', href: '/callbacks', icon: PhoneIcon },
    ...(isOwner ? [
      { name: 'Ρυθμίσεις', href: '/settings', icon: Cog6ToothIcon },
      { name: 'Χρέωση & Λεπτά', href: '/billing', icon: CreditCardIcon },
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
      <header className="md:hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-3 flex items-center justify-between border-b border-blue-100 dark:border-slate-800 shrink-0 z-30 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
            <span>🫁</span>
          </div>
          <span className="text-sm font-bold truncate max-w-[140px] sm:max-w-[200px]">
            {selectedClinic?.name || 'Medical Clinic'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <div className="max-w-[130px] sm:max-w-[180px]">
            <ClinicSwitcher />
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg bg-blue-50 dark:bg-slate-800 transition-colors"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* 2. Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
        />
      )}

      {/* 3. Responsive Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 
        flex flex-col justify-between border-r border-blue-100 dark:border-slate-800
        transition-all duration-300 ease-in-out shadow-lg md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
        ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        <div>
          {/* Sidebar Header */}
          <div className={`flex items-center border-b border-blue-100 d           ark:border-slate-800 h-16 transition-all duration-300 ${
             isSidebarCollapsed ? 'justify-center px-2' : 'justify-between p-4 sm:           p-5'
           }`}>           
             <div className="flex items-center gap-3 overflow-hidden">           
               <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center ju           stify-center text-white font-bold shrink-0 shadow-xs">
                 <span>🫁</span>           
               </div>           
               {!isSidebarCollapsed && (           
                 <div className="truncate transition-opacity duration-200">           
                   <h2 className="text-sm font-bold text-slate-900 dark:text-white            truncate">
                     {selectedClinic?.name || 'Medical Dashboard'}           
                   </h2>           
                   <p className="text-[11px] text-slate-500 dark:text-slate-400 ca           pitalize truncate">
                     Ρόλος: {selectedClinic?.role || 'Staff'}           
                   </p>           
                 </div>           
               )}           
          </div>           
           
  {/* Collapse toggle (Desktop/Tablet) */}
  <button 
    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
    className={`hidden md:flex p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
      isSidebarCollapsed ? 'absolute -right-3 top-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md z-20' : ''
    }`}
    title={isSidebarCollapsed ? "Επέκταση Sidebar" : "Σύμπτυξη Sidebar"}
  >
    {isSidebarCollapsed ? <ChevronRightIcon className="w-3.5 h-3.5" /> : <ChevronLeftIcon className="w-4 h-4" />}
  </button>

  {/* Mobile Close Button */}
  <button 
    onClick={() => setIsMobileMenuOpen(false)}
    className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
  >
    <XMarkIcon className="w-5 h-5" />
  </button>
</div>
          {/* Navigation Items */}
          <nav className="mt-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-600/15 text-blue-700 dark:text-blue-400 border-l-4 border-blue-600 pl-2.5 shadow-2xs' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-blue-100 dark:border-slate-800 space-y-2">
          <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-blue-100 dark:bg-slate-700 text-blue-800 dark:text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 uppercase shadow-2xs">
              {userEmail.charAt(0)}
            </div>
            {!isSidebarCollapsed && (
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{userEmail}</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span> Σύνδεση
                </span>
              </div>
            )}
          </div>

          <button 
            onClick={logout}
            title={isSidebarCollapsed ? "Αποσύνδεση" : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${
              isSidebarCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <ArrowLeftOnRectangleIcon className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Αποσύνδεση</span>}
          </button>
        </div>
      </aside>

      {/* 4. Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden w-full bg-[#f2f6fc] dark:bg-slate-950 transition-colors">
        {/* Desktop Top Navbar Header */}
        <header className="hidden md:flex h-16 bg-white dark:bg-slate-900 border-b border-blue-100 dark:border-slate-800 px-6 lg:px-8 items-center justify-between shrink-0 transition-colors z-10 shadow-2xs">
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {currentTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <ClinicSwitcher />
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-[#f2f6fc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
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
      <DashboardProvider>
        <InnerDashboardLayout>
          {children}
        </InnerDashboardLayout>
      </DashboardProvider>
    </ClinicProvider>
  );
}