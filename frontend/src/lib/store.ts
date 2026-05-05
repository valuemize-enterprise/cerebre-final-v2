import { create } from 'zustand';
import { authApi } from '../lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  company: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  company?: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('cm_token', data.token);
    set({ user: data.user, token: data.token });
  },

  register: async (registerData) => {
    await authApi.register(registerData);
  },

  logout: () => {
    localStorage.removeItem('cm_token');
    set({ user: null, token: null });
  },

  loadFromStorage: async () => {
    try {
      const token = localStorage.getItem('cm_token');
      if (!token) { set({ isLoading: false }); return; }
      const { data } = await authApi.me();
      set({ user: data.user, token, isLoading: false });
    } catch {
      localStorage.removeItem('cm_token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
