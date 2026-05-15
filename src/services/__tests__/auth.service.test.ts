import { api } from '../core/api/client';
import { authService } from '../auth.service';
import { Platform } from 'react-native';

jest.mock('../core/api/client', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call /auth/login with correct parameters and return LoginResponse', async () => {
      const mockResponse = {
        data: {
          data: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            user: { id: '1', nik: '123456', full_name: 'Test User' },
          },
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.login('123456', 'password');

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        nik: '123456',
        password: 'password',
        device_fingerprint: 'local-dev-id',
        device_name: 'Expo App Local',
        device_os: Platform.OS,
      });

      expect(result).toEqual(mockResponse.data.data);
    });
  });
});
