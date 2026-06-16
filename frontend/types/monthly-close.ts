export interface MonthlyClose {
  id: string;
  month: string;
  mode: string;
  status: string;
  triggered_by_user_id?: string;
  uploaded_file_id?: string;
  idempotency_key: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  error_message?: string;
  stats_json?: Record<string, any>;
}

export interface BacktestResult {
  id: string;
  monthly_close_id: string;
  district_id: string;
  district_code?: string;
  district_name?: string;
  region?: string;
  predicted: number;
  actual: number;
  error: number;
  absolute_error: number;
  percentage_error?: number;
  created_at: string;
}

export interface BacktestRow {
  district_code: string;
  district_name: string;
  region: string;
  predicted: number;
  actual: number;
  error: number;
  absolute_error: number;
  percentage_error?: number;
}

export interface DriftFinding {
  id: string;
  monthly_close_id: string;
  district_id: string;
  district_code?: string;
  district_name?: string;
  region?: string;
  drift_type: string;
  severity: string;
  message: string;
  metadata_json?: Record<string, any>;
  created_at: string;
}
