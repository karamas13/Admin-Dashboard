'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClinic } from '@/context/ClinicContext';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { isOwner, isLoading } = useClinic();
  const router = useRouter();

  useEffect(() => {
    // Αν ολοκληρώθηκε η φόρτωση και ο χρήστης ΔΕΝ είναι owner, κάνε redirect
    if (!isLoading && !isOwner) {
      router.replace('/');
    }
  }, [isOwner, isLoading, router]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Έλεγχος δικαιωμάτων πρόσβασης...</div>;
  }

  // Αν δεν είναι owner, μην εμφανίζεις το περιεχόμενο μέχρι να ολοκληρωθεί το redirect
  if (!isOwner) {
    return null;
  }

  return <>{children}</>;
}