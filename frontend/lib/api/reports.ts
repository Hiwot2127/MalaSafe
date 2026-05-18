import { apiClient } from './client';
import type { ReportsOverview, RegionTotals } from '@/types/reports';

interface RawDashboard {
  summary: {
    total_cases: number;
    total_deaths: number;
    active_alerts: number;
    high_risk_districts: number;
    case_fatality_rate: number;
    period: string;
  };
  by_region: RegionTotals[];
}

interface RawTrend {
  period_type: 'weekly' | 'monthly';
  data: {
    period: string;
    cases: number;
    deaths: number;
    case_fatality_rate: number;
  }[];
}

export const reportsApi = {
  /**
   * Composite overview for the year. Pulled from /analytics/dashboard
   * + /analytics/trends since the backend hasn't shipped a dedicated
   * /reports surface yet. Year defaults to the current year.
   */
  async getOverview(year?: number): Promise<ReportsOverview> {
    const y = year ?? new Date().getFullYear();
    const [dashboardRes, trendRes] = await Promise.all([
      apiClient.get<RawDashboard>('/analytics/dashboard'),
      apiClient.get<RawTrend>('/analytics/trends', {
        params: { trend_type: 'monthly', year: y },
      }),
    ]);
    const d = dashboardRes.data;
    const t = trendRes.data;
    return {
      year: String(y),
      total_cases: d.summary.total_cases,
      total_deaths: d.summary.total_deaths,
      case_fatality_rate: d.summary.case_fatality_rate,
      active_alerts: d.summary.active_alerts,
      high_risk_districts: d.summary.high_risk_districts,
      by_region: d.by_region,
      monthly_trend: t.data,
    };
  },
};
