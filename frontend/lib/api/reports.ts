import { apiClient } from './client';
import type { ReportsOverview, RegionTotals } from '@/types/reports';

interface RawDashboard {
  summary: {
    total_positive: number;
    active_alerts: number;
    high_risk_districts: number;
    period: string;
  };
  by_region: RegionTotals[];
}

interface RawTrend {
  period_type: 'weekly' | 'monthly';
  data: {
    period: string;
    positive: number;
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
      total_positive: d.summary.total_positive,
      active_alerts: d.summary.active_alerts,
      high_risk_districts: d.summary.high_risk_districts,
      by_region: d.by_region,
      monthly_trend: t.data,
    };
  },
};
