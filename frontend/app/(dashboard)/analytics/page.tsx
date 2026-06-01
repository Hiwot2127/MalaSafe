'use client';

import { useState } from 'react';
import { Activity, Sparkles } from 'lucide-react';
import { useTrends } from '@/lib/api/queries';
import {
  AlertBanner,
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
  const [trendType, setTrendType] = useState<TrendType>('monthly');

  const { data, isLoading, error } = useTrends({
    trend_type: trendType,
    limit: 20,
  });

  const trends = data?.data ?? [];

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
    <div className="mx-auto flex max-w-6xl flex-col gap-14 animate-fade-in">
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
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both delay-100">
          <div className="glass-panel rounded-2xl overflow-hidden p-1">
            <StatCard
              eyebrow="Total cases"
              value={totals.positive.toLocaleString()}
              caption={`Sum across ${trends.length} month${trends.length === 1 ? '' : 's'} (uploaded CSV data)`}
              icon={Activity}
              tone="signal"
            />
          </div>
          <div className="glass-panel rounded-2xl overflow-hidden p-1">
            <StatCard
              eyebrow="Periods"
              value={trends.length.toLocaleString()}
              caption="Monthly bins"
              icon={Sparkles}
            />
          </div>
        </section>
      )}

      {/* Section 001 - Series */}
      <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
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
        ) : isLoading ? (
          <LoadingScreen caption="Loading series" />
        ) : error ? (
          <AlertBanner tone="error" title="Couldn't load trends" description={(error as Error).message} />
        ) : trends.length === 0 ? (
          <EmptyState
            title="No trend data available"
            description="Upload a monthly malaria CSV to seed the trend series."
          />
        ) : (
          <>
            {/* Sparkline strip + summary */}
            <div className="grid grid-cols-1 gap-px bg-border/40 lg:grid-cols-[1.4fr_1fr] rounded-2xl overflow-hidden glass-panel shadow-lg">
              <div className="flex flex-col gap-4 bg-background/40 backdrop-blur-md p-6 group">
                <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
                <div className="flex items-center justify-between relative z-10">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Cases · oldest → most recent
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary tabular-nums">
                    {trends.length} mo
                  </p>
                </div>
                <div className="relative h-32 w-full mt-2 transition-transform duration-500 group-hover:scale-[1.02]">
                  <svg
                    viewBox="0 0 100 50"
                    preserveAspectRatio="none"
                    className="h-full w-full overflow-visible"
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
                      stroke="currentColor"
                      className="text-primary"
                      strokeWidth="2"
                      points={casesPoints}
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={`M0,50 L${casesPoints} L100,50 Z`}
                      fill="url(#trend-gradient)"
                      opacity="0.1"
                    />
                    <defs>
                      <linearGradient id="trend-gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" className="text-primary" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="flex items-center gap-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground relative z-10">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden className="inline-block size-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
                    {"Cases"}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground tabular-nums relative z-10">
                  <span>{trends[trends.length - 1]?.period ?? '-'}</span>
                  <span>{trends[0]?.period ?? '-'}</span>
                </div>
              </div>
              <div className="flex items-center justify-center bg-background/40 backdrop-blur-md p-6 border-t lg:border-t-0 lg:border-l border-border/40">
                <Metric eyebrow="Total cases" value={totals.positive.toLocaleString()} />
              </div>
            </div>

            {/* Section 002 - Table */}
            <SectionHeader index="002" label="Periods" tone="signal">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                {trends.length} rows
              </span>
            </SectionHeader>
            <div className="overflow-hidden rounded-2xl glass-panel border border-border/40 mt-2 shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/40">
                      <Th>Period</Th>
                      <Th>Year</Th>
                      <Th align="right">Cases</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map((trend, index) => (
                      <tr
                        key={index}
                        className="group border-b border-border/40 transition-all duration-300 last:border-0 hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] cursor-pointer"
                      >
                        <Td>{trend.period}</Td>
                        <Td>{trend.year}</Td>
                        <Td align="right" numeric>
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {trend.positive.toLocaleString()}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
