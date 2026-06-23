// src/app/layout.tsx
import './globals.css'; // Βεβαιώσου ότι το path για το css σου είναι σωστό
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Receptionist Dashboard',
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
        {children}
      </body>
    </html>
  );
}