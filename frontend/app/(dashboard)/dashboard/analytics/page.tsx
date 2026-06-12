'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useDashboard, useRiskMap, useTrends } from '@/lib/api/queries';
import { exportsApi } from '@/lib/api/exports';
import { useToast } from '@/lib/hooks/use-toast';
import type { TrendDataPoint } from '@/types/analytics';
import {
  AlertBanner,
  EditorialSelect,
  EmptyState,
  LoadingScreen,
  PageHeader,
  SectionHeader,
} from '@/components/editorial';
import { CHART, RISK } from '@/components/charts/chart-frame';
import {
  buildRegionRiskMatrix,
  prepareTrendSeries,
  regionOptions,
  riskDistribution,
  scatterPoints,
  topN,
} from '@/lib/analytics-derive';
import { KpiRow } from '@/components/analytics/kpi-row';
import { CaseTrendChart } from '@/components/analytics/case-trend-chart';
import { RegionBar } from '@/components/analytics/region-bar';
import { RegionRiskHeatmap } from '@/components/analytics/region-risk-heatmap';
import { RiskDistributionDonut } from '@/components/analytics/risk-distribution-donut';
import { ConfidenceScatter } from '@/components/analytics/confidence-scatter';
import { TopDistrictsBar } from '@/components/analytics/top-districts-bar';

type TrendType = 'weekly' | 'monthly';

export default function AnalyticsPage() {
  const [trendType, setTrendType] = useState<TrendType>('monthly');
  const [region, setRegion] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { toast } = useToast();

  const regionParam = region || undefined;

  // Region-scoped queries drive the trend, KPIs and risk views.
  const trendsQuery = useTrends({ trend_type: trendType, limit: 24, region: regionParam });
  const dashboardQuery = useDashboard(undefined, undefined, regionParam);
  const riskQuery = useRiskMap(undefined, regionParam);
  // An unfiltered dashboard snapshot powers the region selector and the
  // by-region charts, which the backend blanks out when a single region is set.
  const allRegionsQuery = useDashboard();

  const trends = useMemo(
    () => (trendsQuery.data?.data ?? []) as TrendDataPoint[],
    [trendsQuery.data],
  );
  const trendSeries = useMemo(() => prepareTrendSeries(trends), [trends]);
  const totalPositive = useMemo(
    () => trends.reduce((sum, t) => sum + t.positive, 0),
    [trends],
  );

  const byRegion = allRegionsQuery.data?.by_region ?? [];
  const regionSelectOptions = useMemo(() => regionOptions(byRegion), [byRegion]);

  const features = useMemo(() => riskQuery.data?.features ?? [], [riskQuery.data]);
  const riskMatrix = useMemo(() => buildRegionRiskMatrix(features), [features]);
  const distribution = useMemo(() => riskDistribution(features), [features]);
  const scatter = useMemo(() => scatterPoints(features), [features]);
  const topDistricts = useMemo(() => topN(features, 10), [features]);

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportError(null);
      const filename = await exportsApi.downloadAnalyticsSummary();
      toast({
        title: 'Report downloaded',
        description: `${filename} has been saved to your downloads folder.`,
        variant: 'success',
      });
    } catch (err) {
      const maybe = err as { response?: { data?: { detail?: string } }; message?: string };
      const errorMsg = maybe.response?.data?.detail || maybe.message || 'Failed to export PDF summary';
      setExportError(errorMsg);
      toast({ title: 'Export failed', description: errorMsg, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const isMonthly = trendType === 'monthly';

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 animate-fade-in">
      <PageHeader
        eyebrow="MalaSafe · Analytics"
        title="Analytics"
        description="Case trends, regional burden, and model risk — aggregated from the monthly malaria CSV uploads and the latest prediction run."
        actions={
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            aria-label={exporting ? 'Exporting analytics summary PDF' : 'Export analytics summary PDF'}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground/60 hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-3.5" strokeWidth={1.75} aria-hidden />
            {exporting ? 'Exporting PDF…' : 'Export PDF'}
          </button>
        }
      />

      {exportError ? (
        <AlertBanner tone="error" title="Couldn't export PDF" description={exportError} />
      ) : null}

      {/* Toolbar: region + trend-type filters */}
      <div className="flex flex-wrap items-center gap-3">
        <EditorialSelect
          value={region}
          onChange={setRegion}
          aria-label="Region filter"
          contentWidth="auto"
          options={regionSelectOptions}
        />
        <EditorialSelect
          value={trendType}
          onChange={(next) => setTrendType(next as TrendType)}
          aria-label="Trend type"
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />
      </div>

      {/* 001 · KPI row */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="001" label="Overview" tone="signal" />
        {dashboardQuery.isLoading ? (
          <LoadingScreen caption="Loading summary" />
        ) : dashboardQuery.error ? (
          <AlertBanner tone="error" title="Couldn't load summary" description={(dashboardQuery.error as Error).message} />
        ) : dashboardQuery.data ? (
          <KpiRow summary={dashboardQuery.data.summary} />
        ) : null}
      </section>

      {/* 002 · Case trend */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="002" label={isMonthly ? 'Monthly case trend' : 'Weekly case trend'} tone="signal">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
            {totalPositive.toLocaleString()} cases · {trends.length} {isMonthly ? 'mo' : 'wk'}
          </span>
        </SectionHeader>
        {!isMonthly ? (
          <AlertBanner
            tone="info"
            title="Weekly view coming soon"
            description="The malaria reporting pipeline currently ingests monthly aggregates only. Weekly (ISO-week) granularity is planned — switch to Monthly above for the current view."
          />
        ) : trendsQuery.isLoading ? (
          <LoadingScreen caption="Loading series" />
        ) : trendsQuery.error ? (
          <AlertBanner tone="error" title="Couldn't load trends" description={(trendsQuery.error as Error).message} />
        ) : trends.length === 0 ? (
          <EmptyState title="No trend data available" description="Upload a monthly malaria CSV to seed the trend series." />
        ) : (
          <div className="glass-panel rounded-2xl p-4 shadow-lg">
            <CaseTrendChart data={trendSeries} />
          </div>
        )}
      </section>

      {/* 003 · Regional burden */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="003" label="Regional burden" tone="signal">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
            {byRegion.length} regions
          </span>
        </SectionHeader>
        {allRegionsQuery.isLoading ? (
          <LoadingScreen caption="Loading regions" />
        ) : byRegion.length === 0 ? (
          <EmptyState
            title="No regional breakdown"
            description="Upload monthly malaria data to populate per-region statistics."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="glass-panel rounded-2xl p-4 shadow-lg">
              <p className="mb-3 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Cases by region
              </p>
              <RegionBar data={byRegion} metric="total_positive" color={CHART[0]} />
            </div>
            <div className="glass-panel rounded-2xl p-4 shadow-lg">
              <p className="mb-3 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                High-risk districts by region
              </p>
              <RegionBar data={byRegion} metric="high_risk_count" color={RISK[3]} />
            </div>
          </div>
        )}
      </section>

      {/* 004–006 · Risk model views (share the risk-map query) */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="004" label="Risk landscape" tone="signal">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
            {features.length} districts
          </span>
        </SectionHeader>
        {riskQuery.isLoading ? (
          <LoadingScreen caption="Loading risk predictions" />
        ) : riskQuery.error ? (
          <AlertBanner tone="error" title="Couldn't load risk data" description={(riskQuery.error as Error).message} />
        ) : features.length === 0 ? (
          <EmptyState
            title="No risk predictions yet"
            description="Run the prediction pipeline (or close a month) to populate the risk landscape."
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="glass-panel rounded-2xl p-5 shadow-lg">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Region × risk level · district counts
              </p>
              <RegionRiskHeatmap matrix={riskMatrix} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
              <div className="glass-panel rounded-2xl p-4 shadow-lg">
                <p className="mb-3 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Risk distribution
                </p>
                {distribution.length === 0 ? (
                  <EmptyState title="No risk levels" description="Predictions carry no risk classification yet." />
                ) : (
                  <RiskDistributionDonut data={distribution} />
                )}
              </div>
              <div className="glass-panel rounded-2xl p-4 shadow-lg">
                <p className="mb-3 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Confidence vs prediction score
                </p>
                {scatter.length === 0 ? (
                  <EmptyState title="No scores" description="Predictions carry no confidence/score values yet." />
                ) : (
                  <ConfidenceScatter points={scatter} />
                )}
              </div>
            </div>

            {topDistricts.length > 0 && (
              <div className="glass-panel rounded-2xl p-4 shadow-lg">
                <p className="mb-3 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Top districts by recent positive cases
                </p>
                <TopDistrictsBar data={topDistricts} />
              </div>
            )}
          </div>
        )}
      </section>

      {/* 007 · Periods table */}
      {isMonthly && trends.length > 0 && (
        <section className="flex flex-col gap-5">
          <SectionHeader index="007" label="Periods" tone="signal">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
              {trends.length} rows
            </span>
          </SectionHeader>
          <div className="overflow-hidden rounded-2xl glass-panel border border-border/40 shadow-lg">
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
                      className="group border-b border-border/40 transition-all duration-300 last:border-0 hover:bg-primary/5 cursor-pointer"
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
        </section>
      )}
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}
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
      className={`px-4 py-3 font-sans text-sm text-foreground ${align === 'right' ? 'text-right' : 'text-left'} ${numeric ? 'font-mono tabular-nums' : ''}`}
    >
      {children}
    </td>
  );
}
