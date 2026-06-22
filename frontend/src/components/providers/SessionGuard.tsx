'use client';
/**
 * SessionGuard
 * ─────────────────────────────────────────────────────
 * Wraps the entire app and handles:
 *  1. Session expiry detection (JWT exp check + API 401 intercept)
 *  2. First-login redirect to /onboarding or /client/onboarding
 *  3. Axios global request/response interceptors
 *  4. Graceful "session expired" toast (once per expiry, no infinite loops)
 */
import { useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useAuthStore } from '@/lib/store';

const PUBLIC_AGENCY  = ['/login', '/register', '/forgot-password', '/reset-password', '/onboarding'];
const PUBLIC_CLIENT  = ['/client/login', '/client/set-password', '/client/forgot-password', '/client/reset-password'];
const BYPASS_ROUTES  = [...PUBLIC_AGENCY, ...PUBLIC_CLIENT, '/terms', '/privacy', '/invite'];

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function isFirstLogin(token: string | null): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !!payload.requires_onboarding;
  } catch { return false; }
}

export default function SessionGuard({ children }: { children: ReactNode }) {
  const router      = useRouter();
  const pathname    = usePathname();
  const { token, logout, isHydrated } = useAuthStore();
  const expiredToasted = useRef(false);
  const interceptorSet = useRef(false);

  // ── Axios interceptor (set once) ─────────────────────────
  useEffect(() => {
    if (interceptorSet.current) return;
    interceptorSet.current = true;

    // Attach token to every request
    axios.interceptors.request.use(config => {
      const t = localStorage.getItem('sabi_token') || localStorage.getItem('sabi_client_token');
      if (t && config.headers) config.headers.Authorization = `Bearer ${t}`;
      return config;
    });

    // Handle 401 globally
    axios.interceptors.response.use(
      res => res,
      err => {
        if (err.response?.status === 401) {
          const path = window.location.pathname;
          const isClient = path.startsWith('/client/');
          const isPublic = BYPASS_ROUTES.some(p => path.startsWith(p));
          if (!isPublic && !expiredToasted.current) {
            expiredToasted.current = true;
            toast.error('Your session has expired. Please sign in again.', {
              id: 'session-expired', duration: 5000,
            });
            // Clear the appropriate token
            if (isClient) {
              localStorage.removeItem('sabi_client_token');
              localStorage.removeItem('sabi_client_info');
              setTimeout(() => router.replace(`/client/login?reason=session_expired&redirect=${encodeURIComponent(path)}`), 800);
            } else {
              logout();
              setTimeout(() => router.replace(`/login?reason=session_expired&redirect=${encodeURIComponent(path)}`), 800);
            }
          }
        }
        return Promise.reject(err);
      }
    );
  }, []);

  // ── Proactive token expiry check ─────────────────────────
  useEffect(() => {
    if (!isHydrated) return;
    const path = pathname || '';
    const isPublic = BYPASS_ROUTES.some(p => path.startsWith(p));
    if (isPublic) return;

    const isClientRoute = path.startsWith('/client/');
    const activeToken   = isClientRoute
      ? localStorage.getItem('sabi_client_token')
      : localStorage.getItem('sabi_token');

    if (isTokenExpired(activeToken) && !expiredToasted.current) {
      expiredToasted.current = true;
      toast.error('Your session has expired — please sign in again.', { id: 'session-expired' });
      if (isClientRoute) {
        router.replace(`/client/login?reason=session_expired`);
      } else {
        logout();
        router.replace(`/login?reason=session_expired`);
      }
    }
  }, [isHydrated, pathname]);

  // ── First-login detection for agency users ───────────────
  useEffect(() => {
    if (!isHydrated || !token) return;
    const path = pathname || '';
    if (BYPASS_ROUTES.some(p => path.startsWith(p))) return;
    if (path === '/onboarding') return;

    // Check if this is the user's first login
    if (isFirstLogin(token) && !path.startsWith('/client') && !path.startsWith('/staff')) {
      router.replace('/onboarding');
    }
  }, [isHydrated, token, pathname]);

  // ── First-login detection for client users ───────────────
  useEffect(() => {
    if (!isHydrated) return;
    const path = pathname || '';
    if (!path.startsWith('/client/')) return;
    if (['/client/login', '/client/set-password', '/client/onboarding', '/client/forgot-password', '/client/reset-password'].includes(path)) return;

    const clientToken = localStorage.getItem('sabi_client_token');
    if (!clientToken) return;

    try {
      const payload = JSON.parse(atob(clientToken.split('.')[1]));
      if (payload.requires_onboarding && path !== '/client/onboarding') {
        router.replace('/client/onboarding');
      }
    } catch { /* malformed token — middleware will handle it */ }
  }, [isHydrated, pathname]);

  // Reset expired toast flag when on public routes
  useEffect(() => {
    const path = pathname || '';
    if (BYPASS_ROUTES.some(p => path.startsWith(p))) {
      expiredToasted.current = false;
    }
  }, [pathname]);

  return <>{children}</>;
}
