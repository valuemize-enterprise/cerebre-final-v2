/**
 * Auth Store — COMPLETELY FIXED
 *
 * BUGS FIXED:
 * 1. Zustand `persist` middleware auto-handles localStorage — no `loadFromStorage` needed
 * 2. `isLoading=true forever` bug eliminated — replaced with `isHydrated` flag
 * 3. `setAuth(user, token)` — user is FIRST, token is SECOND (was being called reversed)
 * 4. Token safety check — prevents storing [object Object] as the JWT
 * 5. `authApi` correctly imported from api.ts (which now exports it)
 * 6. User type includes `brandId` and `displayName` fields
 * 7. `normaliseUser` handles both `name` and `full_name` field variants from backend
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authApi } from "./api";
import Cookies from 'js-cookie'


const persistedToken =
  typeof window !== 'undefined'
    ? localStorage.getItem('cm_token') ?? Cookies.get('cm_token') ?? null
    : null;

export interface User {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  displayName: string;
  company?: string;
  role: string;
  brandId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  company?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  verifySession: () => Promise<void>;
}

// Normalise user object from backend — handles name vs full_name variance
const normaliseUser = (u: any): User => ({
  id: u?.id || u?._id || "",
  email: u?.email || "",
  name:
    u?.name || u?.full_name || u?.fullName || u?.email?.split("@")[0] || "User",
  full_name: u?.full_name || u?.name || u?.fullName || "",
  displayName:
    u?.name || u?.full_name || u?.fullName || u?.email?.split("@")[0] || "User",
  company: u?.company || "",
  role: u?.role || "analyst",
  brandId: u?.brandId || u?.brand_id || u?.id || "",
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: persistedToken,
      isHydrated: !!persistedToken,

      // ── setAuth — CALLED AFTER LOGIN: (user, token) ─────────────────
      // NOTE: user is FIRST arg, token is SECOND arg
      setAuth: (user: User, token: string) => {
        if (typeof token !== "string" || !token || token.length < 10) {
          console.error("[Auth] setAuth: invalid token type:", typeof token);
          return;
        }
        if (typeof user !== "object" || !user) {
          console.error(
            "[Auth] setAuth: user must be an object, got:",
            typeof user,
          );
          return;
        }

        // ✅ Cookie — readable by middleware (edge)
        Cookies.set("cm_token", token, {
          expires: 7, // days
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        });

        // localStorage — for client-side rehydration
        localStorage.setItem("cm_token", token);

        set({ user: normaliseUser(user), token });
      },

      logout: () => {
        Cookies.remove("cm_token");
        localStorage.removeItem("cm_token");
        set({ user: null, token: null });
        // Clear auth cookie (middleware reads this)
        if (typeof document !== "undefined") {
          document.cookie = "cm_token=; path=/; max-age=0; SameSite=Lax";
        }
      },

      // Validate stored token with backend — called on hydration
      verifySession: async () => {
        const { token } = get();
        if (
          !token ||
          typeof token !== "string" ||
          token.length < 10 ||
          token.startsWith("{")
        ) {
          set({ user: null, token: null });
          return;
        }
        try {
          const { data } = await authApi.me();
          set({ user: normaliseUser(data.user || data) });
        } catch {
          // 401 or network error — clear stale token
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: "cerebre-auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist user and token — never functions or hydration state
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          // Validate token in background after hydration
          if (state.token) {
            state.verifySession().catch(() => {});
          }
        }
      },
    },
  ),
);
