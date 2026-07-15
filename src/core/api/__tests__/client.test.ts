import { tokenStore } from '../../auth/token-store';

// Mock tokenStore
jest.mock('../../auth/token-store');
jest.mock('../../../stores/auth.store', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      logout: jest.fn(),
    })),
  },
}));

// Mock axios BEFORE importing api
jest.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
  };
});

// Now import api - it will use the mocked axios
import { api } from '../client';

describe('api client interceptors', () => {
  let requestInterceptor: any;
  let responseInterceptorSuccess: any;
  let responseInterceptorError: any;

  beforeAll(() => {
    const mockApi = api as any;
    // Check if use was called and capture the handlers
    if (mockApi.interceptors.request.use.mock.calls.length > 0) {
      requestInterceptor = mockApi.interceptors.request.use.mock.calls[0][0];
    }
    if (mockApi.interceptors.response.use.mock.calls.length > 0) {
      responseInterceptorSuccess = mockApi.interceptors.response.use.mock.calls[0][0];
      responseInterceptorError = mockApi.interceptors.response.use.mock.calls[0][1];
    }
  });

  describe('interceptor registration', () => {
    it('should have registered request interceptor', () => {
      expect(requestInterceptor).toBeDefined();
    });

    it('should have registered response interceptors', () => {
      expect(responseInterceptorSuccess).toBeDefined();
      expect(responseInterceptorError).toBeDefined();
    });
  });

  describe('request interceptor', () => {
    it('should add Authorization header if token exists', async () => {
      (tokenStore.getAccessToken as jest.Mock).mockResolvedValue('test-token');
      const config = { headers: {} };
      
      const result = await requestInterceptor(config);
      
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should not add Authorization header if token is missing', async () => {
      (tokenStore.getAccessToken as jest.Mock).mockResolvedValue(null);
      const config = { headers: {} };
      
      const result = await requestInterceptor(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor', () => {
    it('should return response on success', () => {
      const response = { data: 'test' };
      const result = responseInterceptorSuccess(response);
      expect(result).toBe(response);
    });

    it('should propagate 401 error', async () => {
      const error = {
        config: { url: '/profile' },
        response: { status: 401 },
      };
      
      await expect(responseInterceptorError(error)).rejects.toEqual(error);
    });

    it('should not try session refresh for public auth endpoints', async () => {
      const error = {
        config: { url: '/auth/login' },
        response: { status: 401 },
      };

      await expect(responseInterceptorError(error)).rejects.toEqual(error);
    });

    it('should propagate other errors', async () => {
      const error = {
        response: { status: 500 },
      };
      
      await expect(responseInterceptorError(error)).rejects.toEqual(error);
    });
  });
});
