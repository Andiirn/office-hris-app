import { useAuthStore } from '../auth.store';
import { tokenStore } from '../../core/auth/token-store';

jest.mock('../../core/auth/token-store', () => ({
  tokenStore: {
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state manually if needed, but Zustand stores usually persist in tests
    // unless we use a pattern to reset them. For now, we'll assume a fresh state or reset it.
    useAuthStore.setState({ user: null, isLoggedIn: false });
  });

  it('should have initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });

  it('should set auth data and tokens', async () => {
    const user = { id: '1', nik: '12345', full_name: 'John Doe' };
    const access = 'access-token';
    const refresh = 'refresh-token';

    await useAuthStore.getState().setAuth(user, access, refresh);

    expect(tokenStore.setTokens).toHaveBeenCalledWith(access, refresh);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.isLoggedIn).toBe(true);
  });

  it('should clear auth data and tokens on logout', async () => {
    // Set initial logged in state
    useAuthStore.setState({
      user: { id: '1', nik: '12345', full_name: 'John Doe' },
      isLoggedIn: true,
    });

    await useAuthStore.getState().logout();

    expect(tokenStore.clearTokens).toHaveBeenCalled();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });
});
