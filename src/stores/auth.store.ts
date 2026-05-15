import { create } from 'zustand';
import { tokenStore } from '../core/auth/token-store';

interface User {
  id: string;
  nik: string;
  full_name: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  setAuth: (user: User, access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  setAuth: async (user, access, refresh) => {
    await tokenStore.setTokens(access, refresh);
    set({ user, isLoggedIn: true });
  },
  logout: async () => {
    await tokenStore.clearTokens();
    set({ user: null, isLoggedIn: false });
  },
}));
