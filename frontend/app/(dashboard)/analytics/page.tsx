'use client';

import { useEffect, useState } from 'react';
import { Activity, Sparkles } from 'lucide-react';
import { analyticsApi } from '@/lib/api/analytics';
import { TrendDataPoint } from '@/types/analytics';
import {
  AlertBanner,
  EditorialCard,
  EditorialSelect,
  EmptyState,
  LoadingScreen,
  Metric,
  PageHeader,
  SectionHeader,
  StatCard,
} from '@/components/editorial';

type TrendType = 'weekly' | 'monthly';

export default function AnalyticsPage() {
  // Default to monthly because the upstream pipeline is monthly-only — the
  // monthly_malaria CSV ingest never populates MalariaData.week, so the
  // backend's weekly branch always returns 0 rows. The weekly option stays
  // in the dropdown so users can see it's planned, but selecting it shows
  // an info banner instead of an empty chart.
  const [trendType, setTrendType] = useState<TrendType>('monthly');
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trendType === 'weekly') {
      setTrends([]);
      setLoading(false);
      setError(null);
      return;
    }
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
      acc.positive += t.positive;
      return acc;
    },
    { positive: 0 },
  );

  // Sparkline geometry - cases over time, normalised against the series max.
  const seriesMax = trends.reduce((m, t) => Math.max(m, t.positive), 0);
  const buildPoints = (key: 'positive') =>
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
  const casesPoints = buildPoints('positive');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14">
      <PageHeader
        eyebrow="MalaSafe · Trends"
        title="Analytics"
        description={
          trendType === 'weekly'
            ? 'Week-over-week case movement. (Weekly view is planned — the current data pipeline is monthly-only.)'
            : 'Month-over-month case movement. Cases are aggregated from the monthly malaria CSV uploads (columns: positive, tests, travel).'
        }
      />

      {/* Headline tiles — hidden under the weekly placeholder because the
          totals would render as 0/0 when no weekly rows are returned. */}
      {trendType === 'weekly' ? null : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <StatCard
            eyebrow="Total cases"
            value={totals.positive.toLocaleString()}
            caption={`Sum across ${trends.length} month${trends.length === 1 ? '' : 's'} (uploaded CSV data)`}
            icon={Activity}
            tone="signal"
          />
          <StatCard
            eyebrow="Periods"
            value={trends.length.toLocaleString()}
            caption="Monthly bins"
            icon={Sparkles}
          />
        </section>
      )}

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

        {trendType === 'weekly' ? (
          <AlertBanner
            tone="info"
            title="Weekly view coming soon"
            description="The malaria reporting pipeline currently ingests monthly aggregates only. ISO-week granularity will land once the upload schema supports weekly rows — switch to Monthly above for the current view."
          />
        ) : loading ? (
          <LoadingScreen caption="Loading series" />
        ) : error ? (
          <AlertBanner tone="error" title="Couldn't load trends" description={error} />
        ) : trends.length === 0 ? (
          <EmptyState
            title="No trend data available"
            description="Upload a monthly malaria CSV to seed the trend series."
          />
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
                    {trends.length} mo
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
                </svg>
                <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden className="inline-block size-2.5 bg-chart-1" />
                    Cases
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
                  <span>{trends[trends.length - 1]?.period ?? '-'}</span>
                  <span>{trends[0]?.period ?? '-'}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-1 lg:grid-cols-1 lg:divide-y lg:divide-border lg:bg-card">
                <Metric eyebrow="Total cases" value={totals.positive.toLocaleString()} />
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
                  </tr>
                </thead>
                <tbody>
                  {trends.map((trend, index) => (
                    <tr
                      key={index}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40"
                    >
                      <Td>{trend.period}</Td>
                      <Td>{trend.year}</Td>
                      <Td align="right" numeric>
                        {trend.positive.toLocaleString()}
                      </Td>
                    </tr>
                  ))}
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
