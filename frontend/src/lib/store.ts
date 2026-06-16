import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from './api';
import Cookies from 'js-cookie';

interface User {
  id: string;
  email: string;
  full_name: string;
  company: string;
  role: string;
  name?: string;
  displayName?: string;
  brandId?: string;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  company?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loadFromStorage: () => Promise<void>;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  verifySession: () => Promise<void>;
}

const normaliseUser = (u: any): User => ({
  id: u?.id || u?._id || "",
  email: u?.email || "",
  name: u?.name || u?.full_name || u?.fullName || u?.email?.split("@")[0] || "User",
  full_name: u?.full_name || u?.name || u?.fullName || "",
  displayName: u?.name || u?.full_name || u?.fullName || u?.email?.split("@")[0] || "User",
  company: u?.company || "",
  role: u?.role || "analyst",
  brandId: u?.brandId || u?.brand_id || u?.id || "",
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isHydrated: false,

      setAuth: (user: User, token: string) => {
        if (typeof token !== "string" || !token || token.length < 10) {
          console.error("[Auth] setAuth: invalid token:", typeof token);
          return;
        }
        if (typeof user !== "object" || !user) {
          console.error("[Auth] setAuth: invalid user:", typeof user);
          return;
        }

        Cookies.set("cm_token", token, {
          expires: 7,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
        });
        localStorage.setItem("cm_token", token);

        set({ user: normaliseUser(user), token });
      },

      login: async (email, password) => {
        const { data } = await authApi.login({ email, password });
        get().setAuth(data.user, data.token);
      },

      register: async (registerData) => {
        await authApi.register(registerData);
      },

      logout: () => {
        Cookies.remove("cm_token");
        localStorage.removeItem("cm_token");
        if (typeof document !== "undefined") {
          document.cookie = "cm_token=; path=/; max-age=0; SameSite=Lax";
        }
        set({ user: null, token: null });
      },

      loadFromStorage: async () => {
        try {
          const token = localStorage.getItem("cm_token");
          if (!token) { set({ isLoading: false }); return; }
          const { data } = await authApi.me();
          set({ user: normaliseUser(data.user || data), token, isLoading: false });
        } catch {
          localStorage.removeItem("cm_token");
          set({ user: null, token: null, isLoading: false });
        }
      },

      verifySession: async () => {
        const { token } = get();
        if (!token || typeof token !== "string" || token.length < 10 || token.startsWith("{")) {
          set({ user: null, token: null });
          return;
        }
        try {
          const { data } = await authApi.me();
          set({ user: normaliseUser(data.user || data) });
        } catch {
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: "cerebre-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          if (state.token) {
            state.verifySession().catch(() => {});
          }
        }
      },
    }
  )
);