'use client';

import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api/analytics';
import { TrendDataPoint } from '@/types/analytics';
import { BarChart3, Loader2, TrendingUp } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';

function yearFromPeriod(period: string): string {
  const y = period.split('-')[0];
  return /^\d{4}$/.test(y) ? y : '—';
}

export default function AnalyticsPage() {
  const [trendType, setTrendType] = useState<'weekly' | 'monthly'>('weekly');
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await analyticsApi.getTrends({
          period_type: trendType,
          limit: 20,
        });
        setTrends(Array.isArray(response.data) ? response.data : []);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to fetch trends'));
        setTrends([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, [trendType]);

  const totalCases = trends.reduce((s, t) => s + t.cases, 0);
  const totalDeaths = trends.reduce((s, t) => s + t.deaths, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Malaria trends and case fatality insights"
        icon={BarChart3}
        actions={
          <select
            value={trendType}
            onChange={(e) => setTrendType(e.target.value as 'weekly' | 'monthly')}
            className="ms-select min-w-[160px]"
          >
            <option value="weekly">Weekly trends</option>
            <option value="monthly">Monthly trends</option>
          </select>
        }
      />

      {loading && (
        <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading trends…
        </div>
      )}

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {!loading && !error && trends.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="No trend data yet"
          description="Upload malaria CSV data from the Upload page to see trends here."
        />
      )}

      {!loading && !error && trends.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total cases" value={totalCases} icon={BarChart3} variant="blue" />
            <StatCard label="Total deaths" value={totalDeaths} icon={TrendingUp} variant="red" />
            <StatCard
              label="Average CFR"
              value={`${totalCases > 0 ? ((totalDeaths / totalCases) * 100).toFixed(2) : '0.00'}%`}
              icon={BarChart3}
              variant="amber"
            />
          </div>

          <div className="ms-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              {trendType === 'weekly' ? 'Weekly' : 'Monthly'} trends
            </h2>
            <div className="ms-table-wrap">
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Year</th>
                    <th className="text-right">Cases</th>
                    <th className="text-right">Deaths</th>
                    <th className="text-right">CFR (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((trend, index) => {
                    const cfr =
                      typeof trend.case_fatality_rate === 'number'
                        ? trend.case_fatality_rate.toFixed(2)
                        : trend.cases > 0
                          ? ((trend.deaths / trend.cases) * 100).toFixed(2)
                          : '0.00';
                    return (
                      <tr key={`${trend.period}-${index}`}>
                        <td className="font-medium">{trend.period}</td>
                        <td>{yearFromPeriod(trend.period)}</td>
                        <td className="text-right tabular-nums">{trend.cases.toLocaleString()}</td>
                        <td className="text-right tabular-nums">{trend.deaths.toLocaleString()}</td>
                        <td className="text-right tabular-nums">{cfr}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
