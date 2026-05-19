export interface DashboardSummary {
  total_cases: number;
  total_deaths: number;
  case_fatality_rate: number;
  active_alerts: number;
  high_risk_districts: number;
  period: string;
  /** Human-readable form of `period` (e.g. "January 2024"). Server-supplied so
   *  the UI doesn't have to parse "YYYY-MM" itself. */
  period_label?: string;
  /** Rolling window the high-risk-district count uses, in days. */
  prediction_window_days?: number;
  /** Per-KPI plain-English definitions so the UI can render a tooltip without
   *  hard-coding the methodology. */
  methodology?: Record<string, string>;
}

export interface TrendDataPoint {
  period: string;
  cases: number;
  deaths: number;
  week?: number;
  month?: number;
  year: number;
}

export interface TrendsResponse {
  period_type: 'weekly' | 'monthly';
  data: TrendDataPoint[];
  total_periods: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  recent_trends: TrendDataPoint[];
}
