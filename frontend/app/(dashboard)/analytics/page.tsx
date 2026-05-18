'use client';

import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api/analytics';
import { TrendDataPoint } from '@/types/analytics';
import {
  EditorialCard,
  EditorialSelect,
  Metric,
  PageHeader,
  SectionHeader,
} from '@/components/editorial';

type TrendType = 'weekly' | 'monthly';

export default function AnalyticsPage() {
  const [trendType, setTrendType] = useState<TrendType>('weekly');
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await analyticsApi.getTrends({
          trend_type: trendType,
          limit: 20,
        });
        setTrends(response.data ?? []);
      } catch (err: unknown) {
        const maybe = err as { response?: { data?: { detail?: string } } };
        setError(maybe?.response?.data?.detail || 'Failed to fetch trends');
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [trendType]);

  const totals = trends.reduce(
    (acc, t) => {
      acc.cases += t.cases;
      acc.deaths += t.deaths;
      return acc;
    },
    { cases: 0, deaths: 0 },
  );
  const averageCfr =
    totals.cases > 0 ? ((totals.deaths / totals.cases) * 100).toFixed(2) : '0.00';

  // Sparkline geometry - cases + deaths over time. Each series is normalised
  // against the max of the cases series so death movement is visible on the
  // same axis without overwhelming a death line that's an order of magnitude
  // smaller than the cases line.
  const seriesMax = trends.reduce((m, t) => Math.max(m, t.cases), 0);
  const buildPoints = (key: 'cases' | 'deaths') =>
    trends.length
      ? trends
        .slice()
        .reverse()
        .map((t, i) => {
          const x = (i / Math.max(trends.length - 1, 1)) * 100;
          const y = seriesMax === 0 ? 50 : 50 - (t[key] / seriesMax) * 45;
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ')
      : '';
  const casesPoints = buildPoints('cases');
  const deathsPoints = buildPoints('deaths');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14">
      <PageHeader
        eyebrow="MalaSafe · Trends"
        title="Analytics"
        description={
          trendType === 'weekly'
            ? 'Week-over-week case and mortality movement across the reporting window.'
            : 'Month-over-month case and mortality movement across the reporting window.'
        }
      />

      {/* Section 001 - Series */}
      <section className="flex flex-col gap-5">
        <SectionHeader
          index="001"
          label={trendType === 'weekly' ? 'Weekly series' : 'Monthly series'}
          tone="signal"
        >
          <EditorialSelect
            value={trendType}
            onChange={(next) => setTrendType(next as TrendType)}
            aria-label="Trend type"
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />
        </SectionHeader>

        {loading ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Loading series…
          </p>
        ) : error ? (
          <div className="border border-status-error/40 bg-status-error-tint px-4 py-3 font-sans text-sm text-status-error">
            {error}
          </div>
        ) : trends.length === 0 ? (
          <EditorialCard className="px-6 py-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              No trend data available
            </p>
          </EditorialCard>
        ) : (
          <>
            {/* Sparkline strip + summary */}
            <EditorialCard className="grid grid-cols-1 gap-px bg-border lg:grid-cols-[1.4fr_1fr]">
              <div className="flex flex-col gap-4 bg-card p-6">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Cases · oldest → most recent
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
                    {trends.length} {trendType === 'weekly' ? 'wk' : 'mo'}
                  </p>
                </div>
                <svg
                  viewBox="0 0 100 50"
                  preserveAspectRatio="none"
                  className="h-32 w-full"
                  aria-hidden
                >
                  <line
                    x1="0"
                    y1="49.5"
                    x2="100"
                    y2="49.5"
                    stroke="hsl(var(--border))"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  <polyline
                    fill="none"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth="1"
                    points={casesPoints}
                    vectorEffect="non-scaling-stroke"
                  />
                  <polyline
                    fill="none"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth="1"
                    strokeDasharray="2 1.5"
                    points={deathsPoints}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden className="inline-block size-2.5 bg-chart-1" />
                    Cases
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-[2px] w-3 bg-chart-2"
                      style={{ background: 'repeating-linear-gradient(90deg, hsl(var(--chart-2)) 0 4px, transparent 4px 7px)' }}
                    />
                    Deaths
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
                  <span>{trends[trends.length - 1]?.period ?? '-'}</span>
                  <span>{trends[0]?.period ?? '-'}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3 lg:grid-cols-1 lg:divide-y lg:divide-border lg:bg-card">
                <Metric eyebrow="Total cases" value={totals.cases.toLocaleString()} />
                <Metric eyebrow="Total deaths" value={totals.deaths.toLocaleString()} />
                <Metric eyebrow="Average CFR" value={`${averageCfr}%`} />
              </div>
            </EditorialCard>

            {/* Section 002 - Table */}
            <SectionHeader index="002" label="Periods" tone="signal">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                {trends.length} rows
              </span>
            </SectionHeader>
            <EditorialCard className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <Th>Period</Th>
                    <Th>Year</Th>
                    <Th align="right">Cases</Th>
                    <Th align="right">Deaths</Th>
                    <Th align="right">CFR (%)</Th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((trend, index) => {
                    const cfr =
                      trend.cases > 0
                        ? ((trend.deaths / trend.cases) * 100).toFixed(2)
                        : '0.00';
                    return (
                      <tr
                        key={index}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40"
                      >
                        <Td>{trend.period}</Td>
                        <Td>{trend.year}</Td>
                        <Td align="right" numeric>
                          {trend.cases.toLocaleString()}
                        </Td>
                        <Td align="right" numeric>
                          {trend.deaths.toLocaleString()}
                        </Td>
                        <Td align="right" numeric>
                          {cfr}%
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </EditorialCard>
          </>
        )}
      </section>
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'
        }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  numeric = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  numeric?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 font-sans text-sm text-foreground ${align === 'right' ? 'text-right' : 'text-left'
        } ${numeric ? 'font-mono tabular-nums' : ''}`}
    >
      {children}
    </td>
  );
}
