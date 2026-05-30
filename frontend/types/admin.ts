import { User, UserStatus } from './auth';

export interface DashboardSummary {
  total_users: number;
  active_users: number;
  inactive_users: number;
  locked_users: number;
  password_reset_required: number;
  monthly_uploads: number;
  predictions_generated: number;
  active_alerts: number;
  failed_login_attempts: number;
}

export interface AdminUser extends User {
  failed_login_attempts: number;
  account_locked_until: string | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  status: UserStatus;
}

export interface UnlockAccountResponse {
  message: string;
  status: UserStatus;
}
