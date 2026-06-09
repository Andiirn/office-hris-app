export interface ProfileData {
  id: string;
  nik?: string;
  full_name?: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  address_domicile?: string | null;
  branch_name?: string | null;
  department_name?: string | null;
  position_name?: string | null;
  photo_url?: string | null;
  gender?: string | null;
}

export interface UpdateProfileRequest {
  email?: string | null;
  phone?: string | null;
  address_domicile?: string | null;
}
