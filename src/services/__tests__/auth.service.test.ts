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
          position: { name: 'Developer' },
          division: { name: 'IT' },
          branch: { name: 'HQ' }
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
      position: { name: 'Developer' },
      division: { name: 'IT' },
      branch: { name: 'HQ' },
      company_id: null,
      division_id: null,
      position_name: 'Developer',
      department_name: 'IT',
      branch_name: 'HQ',
      role: 'employee',
    });
  });

  it('requestForgotPassword posts nik and method', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        data: {
          masked_destination: 'andi***@mail.com',
          method: 'EMAIL',
          otp_expires_in_seconds: 300,
        },
      },
    });

    await expect(
      authService.requestForgotPassword({ nik: '123456', method: 'EMAIL' })
    ).resolves.toEqual({
      masked_destination: 'andi***@mail.com',
      method: 'EMAIL',
      otp_expires_in_seconds: 300,
    });

    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password/request', {
      nik: '123456',
      method: 'EMAIL',
    });
  });

  it('verifyForgotPasswordOtp unwraps reset token', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        data: {
          reset_token: 'reset-123',
        },
      },
    });

    await expect(
      authService.verifyForgotPasswordOtp({ nik: '123456', otp_code: '123456' })
    ).resolves.toEqual({
      reset_token: 'reset-123',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password/verify-otp', {
      nik: '123456',
      otp_code: '123456',
    });
  });

  it('resendForgotPasswordOtp posts nik', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        data: {
          masked_destination: 'andi***@mail.com',
          method: 'EMAIL',
        },
      },
    });

    await expect(authService.resendForgotPasswordOtp('123456')).resolves.toEqual({
      masked_destination: 'andi***@mail.com',
      method: 'EMAIL',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password/resend-otp', {
      nik: '123456',
    });
  });

  it('resetForgotPassword posts reset payload', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        data: {},
      },
    });

    await expect(
      authService.resetForgotPassword({
        reset_token: 'reset-123',
        new_password: 'newpass123',
        confirm_password: 'newpass123',
      })
    ).resolves.toBeUndefined();

    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password/reset', {
      reset_token: 'reset-123',
      new_password: 'newpass123',
      confirm_password: 'newpass123',
    });
  });
});
