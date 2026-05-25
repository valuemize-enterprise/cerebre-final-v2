'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../lib/store';

/**
 * useAuth — Ensures the user is authenticated on protected pages.
 *
 * FIXES:
 * 1. Uses `isHydrated` (from persist middleware) instead of `isLoading`
 *    which was permanently `true` because loadFromStorage was never called.
 * 2. Syncs JWT to cookie for Next.js middleware (server-side route protection).
 * 3. Redirects include `?redirect=` so the user returns to the right page after login.
 */
export const useAuth = (redirectTo = '/login') => {
  const router = useRouter();
  const { user, token, isHydrated } = useAuthStore();

  // Sync token to cookie so Next.js middleware can read it server-side
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (token && typeof token === 'string' && token.length > 10) {
      document.cookie = `cm_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    } else {
      document.cookie = 'cm_token=; path=/; max-age=0; SameSite=Lax';
    }
  }, [token]);

  // Wait for hydration before redirecting — avoids false redirect on first load
  useEffect(() => {
    if (isHydrated && !user) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const loginUrl = currentPath && currentPath !== '/'
        ? `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`
        : redirectTo;
      router.replace(loginUrl);
    }
  }, [user, isHydrated, redirectTo, router]);

  return {
    user,
    token,
    isLoading: !isHydrated,  // backwards-compatible alias
    isAuthenticated: !!user && !!token,
  };
};

/**
 * useGuestOnly — Redirects authenticated users away from login/register pages.
 *
 * FIX: Previously returned `{ isLoading: true }` permanently because it read
 * `isLoading` from the store which was never set to false.
 */
export const useGuestOnly = (redirectTo = '/dashboard') => {
  const router = useRouter();
  const { user, token, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && user && token) {
      router.replace(redirectTo);
    }
  }, [user, token, isHydrated, redirectTo, router]);

  return { isLoading: !isHydrated };
};
