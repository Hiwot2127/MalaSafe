export enum UserRole {
  ADMIN = 'admin',
  MOH_OFFICER = 'moh_officer',
  EPHI_OFFICER = 'ephi_officer',
  REGIONAL_OFFICER = 'regional_officer',
  PUBLIC_USER = 'public_user',
}

export type UserStatus = 'active' | 'inactive' | 'locked' | 'password_reset_required';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  district_id?: string;
  is_active: boolean;
  force_password_change?: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  status?: UserStatus;
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
  force_password_change?: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
