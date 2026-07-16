export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    nik: string;
    full_name: string;
  };
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface ForgotPasswordRequestPayload {
  nik: string;
  method: 'EMAIL' | 'WHATSAPP';
}

export interface ForgotPasswordRequestResponse {
  masked_destination: string;
  method: 'EMAIL' | 'WHATSAPP';
  otp_expires_in_seconds?: number;
}

export interface ForgotPasswordVerifyOtpPayload {
  nik: string;
  otp_code: string;
}

export interface ForgotPasswordVerifyOtpResponse {
  reset_token: string;
}

export interface ForgotPasswordResetPayload {
  reset_token: string;
  new_password: string;
  confirm_password: string;
}
