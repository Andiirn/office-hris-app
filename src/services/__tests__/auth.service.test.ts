import { api } from '../../core/api/client';
import { authService } from '../auth.service';

jest.mock('../../core/api/client', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('authService', () => {
  describe('login', () => {
    it('should call /auth/login with correct parameters and return LoginResponse', async () => {
      const mockResponse = {
        data: {
          data: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            user: {
              id: '1',
              nik: '123456',
              full_name: 'Test User',
            },
          },
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await authService.login('123456', 'password');

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        nik: '123456',
        password: 'password',
        device_fingerprint: '',
        device_name: 'Expo App',
        device_os: '',
      });

      expect(result).toEqual(mockResponse.data.data);
    });
  });
});
