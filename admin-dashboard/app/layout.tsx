// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Chrysus Digital Dashboard',
  description: 'Production Customer Admin Panel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-[#f8fafc]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}