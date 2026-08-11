import { create } from 'zustand';
import { queryClient } from '../core/api/query-client';
import { tokenStore } from '../core/auth/token-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  nik: string;
  full_name: string;
  role?: string | null;
  employee_category?: string | null;
  company_id?: string | null;
  branch_id?: string | null;
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
  hasSeenOnboarding: boolean | null;
  bootstrapError: string | null;
  isOffline: boolean;
  setAuth: (user: User, access: string, refresh: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setInitialized: (val: boolean) => void;
  setBootstrapError: (message: string | null) => void;
  setOffline: (val: boolean) => void;
  logout: () => Promise<void>;
  checkOnboarding: () => Promise<void>;
  setOnboardingSeen: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isInitialized: false,
  hasSeenOnboarding: null,
  bootstrapError: null,
  isOffline: false,
  setAuth: async (user, access, refresh) => {
    await tokenStore.setTokens(access, refresh);
    try {
      await AsyncStorage.setItem('cached_user_profile', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to cache user profile', e);
    }
    set({ user, isLoggedIn: true, isInitialized: true, bootstrapError: null });
  },
  setUser: (user) => set({ user, isLoggedIn: !!user }),
  setInitialized: (val) => set({ isInitialized: val }),
  setBootstrapError: (message) => set({ bootstrapError: message }),
  setOffline: (val) => set({ isOffline: val }),
  logout: async () => {
    await tokenStore.clearTokens();
    try {
      await AsyncStorage.removeItem('cached_user_profile');
    } catch (e) {
      console.error('Failed to remove cached user profile', e);
    }
    queryClient.clear();
    set({ user: null, isLoggedIn: false, isInitialized: true, bootstrapError: null });
  },
  checkOnboarding: async () => {
    try {
      const value = await AsyncStorage.getItem('has_seen_onboarding');
      set({ hasSeenOnboarding: value === 'true' });
    } catch {
      set({ hasSeenOnboarding: false });
    }
  },
  setOnboardingSeen: async () => {
    try {
      await AsyncStorage.setItem('has_seen_onboarding', 'true');
      set({ hasSeenOnboarding: true });
    } catch (e) {
      console.error('Failed to set onboarding seen', e);
    }
  },
}));
