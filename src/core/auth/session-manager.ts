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
      const user = await authService.getProfile();
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
