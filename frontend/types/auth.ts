export enum UserRole {
  ADMIN = 'admin',
  MOH_OFFICER = 'moh_officer',
  EPHI_OFFICER = 'ephi_officer',
  REGIONAL_OFFICER = 'regional_officer',
  PUBLIC_USER = 'public_user',
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  district_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
