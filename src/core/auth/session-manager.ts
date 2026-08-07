import { CancelledError } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import { setSuppressAuthErrorAlerts } from '../api/client';
import { queryClient } from '../api/query-client';
import { qk } from '../query/query-keys';
import { tokenStore } from './token-store';

export const sessionManager = {
  async initialize() {
    const accessToken = await tokenStore.getAccessToken();
    if (!accessToken) {
      console.log('[SessionManager] No access token found');
      await useAuthStore.getState().setInitialized(true);
      return;
    }

    try {
      console.log('[SessionManager] Fetching profile...');
      useAuthStore.getState().setBootstrapError(null);
      setSuppressAuthErrorAlerts(true);

      // Fetch profile and store in cache
      const profile = await queryClient.fetchQuery({
        queryKey: qk.profile(),
        queryFn: () => authService.getProfile(),
      });

      const user = {
        id: profile.id,
        nik: profile.nik || '',
        full_name: profile.full_name || '',
        role: profile.role,
        employee_category: profile.employee_category ?? null,
        company_id: profile.company_id || profile.company?.id || null,
        position_name: profile.position_name,
        department_name: profile.department_name,
        branch_name: profile.branch_name,
        email: profile.email,
        phone: profile.phone,
        photo_url: profile.photo_url,
      };

      const refreshToken = await tokenStore.getRefreshToken();

      // Update Auth Store
      await useAuthStore.getState().setAuth(user, accessToken, refreshToken || '');

      console.log('[SessionManager] Session initialized for:', user.full_name);
    } catch (error) {
      if (error instanceof CancelledError) {
        console.log('[SessionManager] Session initialization cancelled');
        return;
      }

      console.error('[SessionManager] Failed to initialize session:', error);

      if (isAxiosError(error) && error.response?.status === 401) {
        await tokenStore.clearTokens();
        useAuthStore.getState().setUser(null);
        useAuthStore.getState().setInitialized(true);
        useAuthStore.getState().setBootstrapError(null);
        return;
      }

      useAuthStore.getState().setBootstrapError(
        'Gagal memuat profil. Cek koneksi lalu coba lagi.',
      );
    } finally {
      setSuppressAuthErrorAlerts(false);
      // Ensure app is always initialized
      useAuthStore.getState().setInitialized(true);
    }
  },

  async logout() {
    console.log('[SessionManager] Logging out...');
    await useAuthStore.getState().logout();
  }
};
