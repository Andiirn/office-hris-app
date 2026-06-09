import { tokenStore } from './token-store';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services/auth.service';

export const sessionManager = {
  async initialize() {
    const accessToken = await tokenStore.getAccessToken();
    if (!accessToken) {
      console.log('[SessionManager] No access token found');
      return;
    }

    try {
      console.log('[SessionManager] Fetching profile...');
      const profile = await authService.getProfile();
      const user = {
        id: profile.id,
        nik: profile.nik || '',
        full_name: profile.full_name || '',
        position_name: profile.position_name,
        department_name: profile.department_name,
        branch_name: profile.branch_name,
        email: profile.email,
        phone: profile.phone,
        photo_url: profile.photo_url,
      };
      const refreshToken = await tokenStore.getRefreshToken();
      await useAuthStore.getState().setAuth(user, accessToken, refreshToken || '');
      console.log('[SessionManager] Session initialized for:', user.full_name);
    } catch (error) {
      console.error('[SessionManager] Failed to initialize session:', error);
      await this.logout();
    }
  },

  async logout() {
    console.log('[SessionManager] Logging out...');
    await tokenStore.clearTokens();
    await useAuthStore.getState().logout();
  }
};
