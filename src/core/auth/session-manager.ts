import { tokenStore } from './token-store';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services/auth.service';
import { queryClient } from '../api/query-client';
import { qk } from '../query/query-keys';
import { Alert } from 'react-native';
import axios from 'axios';

export const sessionManager = {
  async initialize() {
    const accessToken = await tokenStore.getAccessToken();
    if (!accessToken) {
      console.log('[SessionManager] No access token found');
      useAuthStore.getState().setBootstrapError(null);
      await useAuthStore.getState().setInitialized(true);
      return;
    }

    try {
      console.log('[SessionManager] Fetching profile...');
      useAuthStore.getState().setBootstrapError(null);
      
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
      console.error('[SessionManager] Failed to initialize session:', error);
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        useAuthStore.getState().setBootstrapError(null);
        Alert.alert(
          'Sesi Berakhir',
          'Sesi Anda telah habis atau tidak valid. Silakan login kembali.',
          [{ text: 'OK', onPress: () => this.logout() }]
        );
      } else {
        useAuthStore.getState().setBootstrapError(
          'Gagal memuat profil. Cek koneksi lalu coba lagi.',
        );
      }
    } finally {
      // Ensure app is always initialized
      useAuthStore.getState().setInitialized(true);
    }
  },

  async logout() {
    console.log('[SessionManager] Logging out...');
    await useAuthStore.getState().logout();
  }
};
