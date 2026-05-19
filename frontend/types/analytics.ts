export interface DashboardSummary {
  total_cases: number;
  total_deaths: number;
  case_fatality_rate: number;
  active_alerts: number;
  high_risk_districts: number;
  period: string;
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
