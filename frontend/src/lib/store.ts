import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from './api';
import { BRAND } from './brand';

/**
 * Sabi Auth Store
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for agency/staff authentication state.
 * Client portal auth is handled separately via localStorage directly
 * (BRAND.storage.clientToken / clientInfo) since clients are not
 * agency users and don't need the full Zustand store.
 *
 * Persisted to localStorage under BRAND.storage.zustandStore ('sabi-auth').
 * The raw token is ALSO mirrored to BRAND.storage.agencyToken ('sabi_token')
 * as a plain string for axios interceptors and pages that read it directly
 * via localStorage.getItem('sabi_token').
 */

export interface User {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  company?: string;
  role: 'admin' | 'analyst' | 'staff' | string;
  role_title?: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;

  /** Set auth state directly — used by login/register/onboarding flows */
  setAuth: (user: User, token: string) => void;

  /** Convenience login that calls the API then sets state */
  login: (email: string, password: string) => Promise<void>;

  /** Clears all auth state and mirrored localStorage token */
  logout: () => void;

  /** Update user fields without touching the token (e.g. after profile edit) */
  updateUser: (partial: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isHydrated: false,

      setAuth: (user, token) => {
        // Mirror to plain localStorage key for axios interceptors / direct reads
        if (typeof window !== 'undefined') {
          localStorage.setItem(BRAND.storage.agencyToken, token);
        }
        set({ user, token });
      },

      login: async (email, password) => {
        const { data } = await authApi.login({ email, password });
        get().setAuth(data.user, data.token);
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(BRAND.storage.agencyToken);
        }
        set({ user: null, token: null });
      },

      updateUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },
    }),
    {
      name: BRAND.storage.zustandStore, // 'sabi-auth'
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        // Called once persisted state has been read from localStorage.
        // Ensure the mirrored plain token key stays in sync after rehydration.
        if (state?.token && typeof window !== 'undefined') {
          localStorage.setItem(BRAND.storage.agencyToken, state.token);
        }
        // Mark hydrated via direct mutation since onRehydrateStorage runs
        // outside the normal set() flow.
        useAuthStore.setState({ isHydrated: true });
      },
    }
  )
);
