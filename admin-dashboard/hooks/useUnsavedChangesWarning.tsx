'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useUnsavedChangesWarning(isDirty: boolean) {
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);
  const [nextUrl, setNextUrl] = useState<string | null>(null);

  // 1. Handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 2. Handle browser back/forward buttons
  useEffect(() => {
    if (!isDirty) return;

    // Push state so back button triggers popstate instead of leaving immediately
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      if (isDirty) {
        e.preventDefault();
        setShowPrompt(true);
        // Re-push current URL to keep user on page until confirmed
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty]);

  // 3. Intercept internal anchor link clicks across the app (sidebar, header, etc.)
  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      // Ignore external links, anchors, or same page
      if (!href || href.startsWith('http') || href.startsWith('#') || href === window.location.pathname) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setNextUrl(href);
      setShowPrompt(true);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isDirty]);

  const confirmNavigation = useCallback(() => {
    setShowPrompt(false);
    if (nextUrl) {
      router.push(nextUrl);
    } else {
      // If back button was pressed
      window.history.back();
    }
  }, [nextUrl, router]);

  const cancelNavigation = useCallback(() => {
    setShowPrompt(false);
    setNextUrl(null);
  }, []);

  return {
    showPrompt,
    confirmNavigation,
    cancelNavigation,
  };
}