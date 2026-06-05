import { api } from '../../core/api/client';
import { authService } from '../auth.service';

jest.mock('../../core/api/client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('authService', () => {
  it('getProfile unwraps profile data', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          id: 'emp-1',
          nik: '12345',
          full_name: 'Andi',
          email: 'andi@example.com',
        },
      },
    });

    const result = await authService.getProfile();

    expect(api.get).toHaveBeenCalledWith('/profile');
    expect(result).toEqual({
      id: 'emp-1',
      nik: '12345',
      full_name: 'Andi',
      email: 'andi@example.com',
    });
  });
});
