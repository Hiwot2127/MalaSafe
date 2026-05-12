export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'moh_officer' | 'ephi_officer' | 'regional_officer' | 'public_user';
  district_id?: string;
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
