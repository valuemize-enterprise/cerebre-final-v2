'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../lib/store';

/**
 * Ensures the user is authenticated.
 * Call at the top of any protected page as a safety net alongside middleware.
 * Syncs the JWT to a cookie so Next.js middleware can read it server-side.
 */
export const useAuth = (redirectTo = '/login') => {
  const router = useRouter();
  const { user, token, isLoading } = useAuthStore();

  // Keep cookie in sync with localStorage token for middleware
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (token) {
      document.cookie = `cm_token=${token}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    } else {
      document.cookie = 'cm_token=; path=/; max-age=0';
    }
  }, [token]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, redirectTo, router]);

  return { user, token, isLoading, isAuthenticated: !!user };
};

/**
 * Redirect authenticated users away from auth pages (login/register).
 */
export const useGuestOnly = (redirectTo = '/dashboard') => {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirectTo);
    }
  }, [user, isLoading, redirectTo, router]);

  return { isLoading };
};
