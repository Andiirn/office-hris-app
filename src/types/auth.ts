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
