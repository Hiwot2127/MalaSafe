import type { DashboardSummary } from './analytics';

export interface ReportsOverview {
  generated_at: string;
  summary: DashboardSummary;
  monthly_trends: Array<{
    period: string;
    cases: number;
    deaths: number;
    case_fatality_rate: number;
  }>;
  risk_map_metadata: {
    total_districts?: number;
    high_risk?: number;
    moderate_risk?: number;
    low_risk?: number;
    generated_at?: string;
    date_filter?: string;
  };
  alerts_snapshot: {
    total: number;
    active_count: number;
    high_risk_count: number;
  };
}
