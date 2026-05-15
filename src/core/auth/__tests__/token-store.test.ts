import * as SecureStore from 'expo-secure-store';
import { tokenStore } from '../token-store';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('tokenStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set tokens correctly', async () => {
    await tokenStore.setTokens('access-token', 'refresh-token');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_access_token', 'access-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_refresh_token', 'refresh-token');
  });

  it('should get access token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('access-token');

    const token = await tokenStore.getAccessToken();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(token).toBe('access-token');
  });

  it('should get refresh token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('refresh-token');

    const token = await tokenStore.getRefreshToken();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_refresh_token');
    expect(token).toBe('refresh-token');
  });

  it('should clear tokens', async () => {
    await tokenStore.clearTokens();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_refresh_token');
  });
});
