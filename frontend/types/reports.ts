// Reports types — the backend doesn't yet expose a dedicated /reports surface,
// so reports are assembled from /analytics/dashboard + /analytics/trends.

export interface RegionTotals {
  region: string;
  total_positive: number;
  districts_count: number;
  high_risk_count: number;
}

export interface ReportsOverview {
  year: string;
  total_positive: number;
  active_alerts: number;
  high_risk_districts: number;
  by_region: RegionTotals[];
  monthly_trend: {
    period: string;
    positive: number;
  }[];
}
