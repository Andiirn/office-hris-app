import { create } from 'zustand';
import { queryClient } from '../core/api/query-client';
import { tokenStore } from '../core/auth/token-store';

export interface User {
  id: string;
  nik: string;
  full_name: string;
  role?: string | null;
  company_id?: string | null;
  position_name?: string | null;
  department_name?: string | null;
  branch_name?: string | null;
  email?: string | null;
  phone?: string | null;
  photo_url?: string | null;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isInitialized: boolean;
  bootstrapError: string | null;
  setAuth: (user: User, access: string, refresh: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setInitialized: (val: boolean) => void;
  setBootstrapError: (message: string | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isInitialized: false,
  bootstrapError: null,
  setAuth: async (user, access, refresh) => {
    await tokenStore.setTokens(access, refresh);
    set({ user, isLoggedIn: true, isInitialized: true, bootstrapError: null });
  },
  setUser: (user) => set({ user, isLoggedIn: !!user }),
  setInitialized: (val) => set({ isInitialized: val }),
  setBootstrapError: (message) => set({ bootstrapError: message }),
  logout: async () => {
    await tokenStore.clearTokens();
    queryClient.clear();
    set({ user: null, isLoggedIn: false, isInitialized: true, bootstrapError: null });
  },
}));
