'use client';

import Link from 'next/link';
import { ArrowUpRight, MapPin, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { useDashboard, useAlerts } from '@/lib/api/queries';
import { predictionsApi } from '@/lib/api/predictions';
import { useQuery } from '@tanstack/react-query';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertCard,
  EditorialCard,
  Metric,
  PageHeader,
  SectionHeader,
  StatusPill,
  riskLabel,
  riskStatus,
} from '@/components/editorial';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { DashboardError } from '@/components/dashboard/dashboard-error';
import { formatDateTime } from '@/lib/utils';
import { useCounterAnimation } from '@/lib/hooks/use-counter-animation';
import { useMemo } from 'react';

// Dashboard page - Main surveillance overview

const QUICK_LINKS = [
  {
    index: '01',
    eyebrow: 'Ingest',
    title: 'Upload data',
    description: 'Drop a malaria or climate CSV.',
    href: '/dashboard/upload',
  },
  {
    index: '02',
    eyebrow: 'Surface',
    title: 'Risk maps',
    description: 'District-level heat at a glance.',
    href: '/dashboard/maps',
  },
  {
    index: '03',
    eyebrow: 'Series',
    title: 'Analytics',
    description: 'Weekly and monthly trends.',
    href: '/dashboard/analytics',
  },
];

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  
  // Fetch top 5 high-risk districts
  const { data: topDistricts } = useQuery({
    queryKey: ['top-risk-districts'],
    queryFn: async () => {
      const response = await predictionsApi.getLatest({ 
        risk_level: 'very_high',
        limit: 5 
      });
      return response.items || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Fetch recent alerts for activity timeline
  const { data: recentAlerts } = useAlerts({
    limit: 5,
  });

  // Extract data (with fallbacks for early returns)
  const stats = data?.summary;
  const byRegion = data?.by_region || [];
  const recentTrends = data?.recent_trends || [];
  const cases = stats?.total_positive ?? 0;
  const activeAlerts = stats?.active_alerts ?? 0;
  const highRisk = stats?.high_risk_districts ?? 0;

  // Animated counters - MUST be called before any conditional returns
  const animatedCases = useCounterAnimation(cases, 1500);
  const animatedAlerts = useCounterAnimation(activeAlerts, 1200);
  const animatedHighRisk = useCounterAnimation(highRisk, 1200);

  // Calculate trends (comparing last 2 periods if available)
  const trendData = useMemo(() => {
    if (recentTrends.length < 2) return { casesTrend: null, alertsTrend: null };
    
    const latest = recentTrends[0];
    const previous = recentTrends[1];
    
    const casesChange = latest.positive - previous.positive;
    const casesPct = previous.positive === 0 ? 0 : (casesChange / previous.positive) * 100;
    
    return {
      casesTrend: { change: casesChange, percent: casesPct },
      currentPeriod: latest.period,
      previousPeriod: previous.period,
    };
  }, [recentTrends]);

  // Regional breakdown for chart
  const regionChartData = useMemo(() => {
    if (byRegion.length === 0) return [];
    const sorted = [...byRegion].sort((a, b) => b.total_positive - a.total_positive);
    const max = sorted[0]?.total_positive || 1;
    return sorted.slice(0, 8).map(r => ({
      region: r.region,
      cases: r.total_positive,
      percentage: (r.total_positive / max) * 100,
      highRisk: r.high_risk_count,
    }));
  }, [byRegion]);

  // Conditional returns AFTER all hooks
  if (isLoading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error as Error} onRetry={refetch} />;
  if (!data) return null;

  const period = stats?.period || 'Current period';
  const periodLabel = stats?.period_label || period;
  const predWindow = stats?.prediction_window_days ?? 30;
  const methodology = stats?.methodology ?? {};
  const riskThresholds = stats?.risk_thresholds ?? null;
  const modelVersion = stats?.model_version ?? null;
  const thresholdsVersion = stats?.thresholds_version ?? null;

  // Last updated timestamp
  const lastUpdated = new Date();

  const alertsPerDistrict = highRisk > 0 ? activeAlerts / highRisk : 0;
  const postureStatus: 'valid' | 'warn' | 'error' =
    activeAlerts === 0 && highRisk === 0
      ? 'valid'
      : alertsPerDistrict >= 20 || activeAlerts > 1000
        ? 'error'
        : 'warn';
  const postureLabel =
    postureStatus === 'valid'
      ? 'Posture stable'
      : postureStatus === 'error'
        ? 'Triage required'
        : 'Posture monitoring';

  const alertEyebrow =
    postureStatus === 'valid'
      ? 'All clear'
      : postureStatus === 'error'
        ? 'Critical'
        : 'Monitoring';
  const alertDescription =
    activeAlerts > 0
      ? `Review the alerts queue to triage and dispatch (${periodLabel}).`
      : `No alerts open against ${periodLabel}. Caseload within expected thresholds.`;
  const alertStats =
    activeAlerts > 0 || highRisk > 0
      ? [
          { value: activeAlerts.toLocaleString(), label: 'alerts open' },
          { value: highRisk.toLocaleString(), label: 'high-risk districts' },
        ]
      : undefined;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 animate-fade-in">
      <PageHeader
        eyebrow={`MalaSafe · ${period}`}
        title="Surveillance dashboard"
        description={
          <>
            <p>A standing read on caseload, alerting posture, and risk concentration. Numbers update with each monthly close.</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Clock className="size-3" strokeWidth={2} />
              Last updated: {formatDateTime(lastUpdated)}
            </p>
          </>
        }
      />

      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }} data-testid="posture-alert">
        <AlertCard
          tone={postureStatus}
          eyebrow={alertEyebrow}
          title={postureLabel}
          stats={alertStats}
          description={alertDescription}
          cta={activeAlerts > 0 ? { label: 'Review alerts', href: '/dashboard/alerts' } : undefined}
        />
      </div>

      <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <SectionHeader index="001" label="Indicators" tone={postureStatus}>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {period}
            </span>
            <StatusPill kind={postureStatus}>
              {postureStatus === 'valid'
                ? 'Stable'
                : postureStatus === 'error'
                  ? 'Critical'
                  : 'Monitoring'}
            </StatusPill>
          </div>
        </SectionHeader>
        <div className="glass-panel overflow-hidden rounded-2xl shadow-lg border border-border/40 bg-background/40">
          <div className="grid grid-cols-1 divide-y divide-border/40 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3">
            <div className="relative p-6 overflow-hidden group" data-testid="kpi-card">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="flex items-start justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Total cases</p>
                <StatusPill kind="neutral">Reported</StatusPill>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="mt-4 font-display text-4xl font-bold tracking-tight text-gradient" data-testid="total-cases-value">
                  {animatedCases.toLocaleString()}
                </p>
                {trendData.casesTrend && (
                  <div className={`flex items-center gap-1 font-mono text-sm ${
                    trendData.casesTrend.change > 0 ? 'text-status-error' : trendData.casesTrend.change < 0 ? 'text-status-valid' : 'text-muted-foreground'
                  }`}>
                    {trendData.casesTrend.change > 0 ? (
                      <TrendingUp className="size-4" strokeWidth={2} />
                    ) : trendData.casesTrend.change < 0 ? (
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.511l-5.511-3.181" />
                      </svg>
                    ) : null}
                    <span className="tabular-nums">{trendData.casesTrend.percent > 0 ? '+' : ''}{trendData.casesTrend.percent.toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <p className="mt-2 font-sans text-xs text-muted-foreground">{periodLabel}</p>
              {recentTrends.length > 0 && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                  {recentTrends.length} months tracked
                </p>
              )}
            </div>

            <div className="relative p-6 overflow-hidden group" data-testid="kpi-card">
              <div className="absolute inset-0 bg-gradient-to-br from-status-error/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="flex items-start justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Active alerts</p>
                <StatusPill kind={activeAlerts === 0 ? 'valid' : activeAlerts > 3 ? 'error' : 'warn'}>
                  {activeAlerts === 0 ? 'Clear' : 'Open'}
                </StatusPill>
              </div>
              <p className="mt-4 font-display text-4xl font-bold tracking-tight">{animatedAlerts.toLocaleString()}</p>
              <p className="mt-2 font-sans text-xs text-muted-foreground">Across dataset</p>
              {activeAlerts > 0 && (
                <Link 
                  href="/dashboard/alerts" 
                  className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary hover:underline"
                >
                  Review now
                  <ArrowUpRight className="size-3" strokeWidth={2} />
                </Link>
              )}
            </div>

            <div className="relative p-6 overflow-hidden group" data-testid="kpi-card">
              <div className="absolute inset-0 bg-gradient-to-br from-status-warn/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="flex items-start justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">High risk districts</p>
                <StatusPill kind={highRisk === 0 ? 'valid' : highRisk > 5 ? 'error' : 'warn'}>
                  {highRisk === 0 ? 'Stable' : 'Watch'}
                </StatusPill>
              </div>
              <p className="mt-4 font-display text-4xl font-bold tracking-tight">{animatedHighRisk.toLocaleString()}</p>
              <p className="mt-2 font-sans text-xs text-muted-foreground">Forecast last {predWindow}d</p>
              {highRisk > 0 && (
                <Link 
                  href="/dashboard/predictions" 
                  className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary hover:underline"
                >
                  View details
                  <ArrowUpRight className="size-3" strokeWidth={2} />
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-px bg-border/40 md:grid-cols-2 rounded-2xl overflow-hidden shadow-sm glass-panel">
          <div className="bg-background/40 backdrop-blur-md p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.20em] text-muted-foreground">
              Caseload signal
            </p>
            <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-foreground">
              Aggregated positive case counts across the reporting window.
            </p>
          </div>
          <div className="bg-background/40 backdrop-blur-md p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.20em] text-muted-foreground">
              Geographic concentration
            </p>
            <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-foreground">
              <strong className="text-primary">{activeAlerts.toLocaleString()} active alerts</strong> open against the current close.
              Open the risk surface to drill into a region.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/maps"
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary/10 hover:shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]"
                aria-label="View risk surface map"
              >
                View risk surface
                <ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden />
              </Link>
              {activeAlerts > 0 ? (
                <Link
                  href="/dashboard/alerts"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-foreground shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] transition-all hover:opacity-90 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.8)]"
                  aria-label={`Review ${activeAlerts} active alert${activeAlerts !== 1 ? 's' : ''}`}
                >
                  Review alerts
                  <ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        {(modelVersion || thresholdsVersion || riskThresholds) && (
          <p className="font-mono text-[11px] uppercase tracking-[0.20em] text-muted-foreground">
            {modelVersion ? <>Model {modelVersion}</> : null}
            {modelVersion && (thresholdsVersion || riskThresholds) ? ' · ' : null}
            {thresholdsVersion ? <>Thresholds {thresholdsVersion}</> : null}
            {thresholdsVersion && riskThresholds ? ' · ' : null}
            {riskThresholds ? (
              <>
                Global cutoffs p50={riskThresholds.p50.toFixed(0)} · p75=
                {riskThresholds.p75.toFixed(0)} · p95={riskThresholds.p95.toFixed(0)}
              </>
            ) : null}
          </p>
        )}
      </section>

      {/* Regional Breakdown Chart */}
      {regionChartData.length > 0 && (
        <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '225ms' }}>
          <SectionHeader index="001A" label="Cases by Region" tone="signal">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Top {regionChartData.length} regions
            </span>
          </SectionHeader>
          <div className="glass-panel rounded-2xl border border-border/40 bg-background/40 p-6">
            <div className="flex flex-col gap-3">
              {regionChartData.map((item, index) => (
                <div key={item.region} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums w-4">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-sm truncate">{item.region}</span>
                      {item.highRisk > 0 && (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-status-error">
                          <AlertTriangle className="size-3" strokeWidth={2} />
                          {item.highRisk}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-sm tabular-nums text-foreground ml-3">
                      {item.cases.toLocaleString()}
                    </span>
                  </div>
                  <div className="relative h-2 bg-secondary/40 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${item.percentage}%`,
                        animationDelay: `${index * 50}ms`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top High-Risk Districts */}
      {topDistricts && topDistricts.length > 0 && (
        <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
          <SectionHeader index="001A" label="Top High-Risk Districts" tone="error">
            <Link
              href="/dashboard/predictions"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary hover:underline"
            >
              View all
            </Link>
          </SectionHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topDistricts.slice(0, 6).map((district: any, index: number) => (
              <Link
                key={district.district_code}
                href={`/dashboard/predictions?district=${district.district_code}`}
                className="glass-panel rounded-xl border border-border/40 bg-background/40 p-4 transition-all hover:border-primary/30 hover:bg-background/60 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" strokeWidth={1.5} />
                      <h3 className="font-semibold text-sm leading-tight">{district.district_name}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{district.region}</p>
                  </div>
                  <StatusPill kind={riskStatus(district.risk_level)}>
                    {riskLabel(district.risk_level)}
                  </StatusPill>
                </div>
                <div className="mt-3 flex items-baseline gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Score</p>
                    <p className="font-display text-2xl font-bold tabular-nums text-primary">
                      {district.prediction_score.toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recent</p>
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      {district.recent_positive.toLocaleString()}
                    </p>
                  </div>
                  {typeof district.confidence_score === 'number' && (
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Confidence</p>
                      <p className="font-mono text-sm tabular-nums text-muted-foreground">
                        {(district.confidence_score * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity Timeline */}
      {recentAlerts && recentAlerts.alerts && recentAlerts.alerts.length > 0 && (
        <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '275ms' }}>
          <SectionHeader index="001B" label="Recent Activity" tone="signal">
            <Link
              href="/dashboard/alerts"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary hover:underline"
            >
              View all
            </Link>
          </SectionHeader>
          <div className="glass-panel rounded-2xl border border-border/40 bg-background/40 p-6">
            <div className="flex flex-col gap-4">
              {recentAlerts.alerts.slice(0, 5).map((alert: any, index: number) => (
                <div key={alert.id} className="flex items-start gap-4 pb-4 last:pb-0 border-b last:border-0 border-border/40">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`rounded-full p-2 ${
                      riskStatus(alert.risk_level) === 'error' 
                        ? 'bg-status-error/10 text-status-error' 
                        : riskStatus(alert.risk_level) === 'warn'
                        ? 'bg-status-warn/10 text-status-warn'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {alert.is_active ? (
                        <AlertTriangle className="size-4" strokeWidth={2} />
                      ) : (
                        <Clock className="size-4" strokeWidth={2} />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <Link
                          href={`/dashboard/predictions?district=${alert.district_id}`}
                          className="font-semibold text-sm hover:text-primary transition-colors"
                        >
                          {alert.district_name || 'Unknown District'}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {alert.message}
                        </p>
                      </div>
                      <StatusPill kind={riskStatus(alert.risk_level)}>
                        {riskLabel(alert.risk_level)}
                      </StatusPill>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {alert.region && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" strokeWidth={2} />
                          {alert.region}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" strokeWidth={2} />
                        {formatDateTime(alert.created_at)}
                      </span>
                      {alert.is_active && (
                        <span className="inline-flex items-center gap-1 text-status-error">
                          <span className="inline-block size-1.5 rounded-full bg-status-error animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <SectionHeader index="002" label="How this works" tone="signal" />
        <EditorialCard className="p-0">
          <Accordion type="single" collapsible defaultValue="item-predict">
            <AccordionItem value="item-predict">
              <AccordionTrigger eyebrow="Forecasting">
                How are predictions generated?
              </AccordionTrigger>
              <AccordionContent>
                A LightGBM model trained on historical case counts, tests, travel,
                weekly climate, and district geography produces a forward-looking
                risk score per district per month. Cold-start districts use a
                climate + geography-only sub-model until enough history accumulates.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-close">
              <AccordionTrigger eyebrow="Workflow">
                How do I add a monthly close?
              </AccordionTrigger>
              <AccordionContent>
                Upload a monthly malaria CSV from the Upload page. The validator
                surfaces row-level tolerance issues before commit. Once accepted,
                the close kicks off a re-prediction across all districts and
                refreshes this dashboard.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </EditorialCard>
      </section>

      <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <SectionHeader index="003" label="Jump to" tone="signal" />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {QUICK_LINKS.map((item) => (
            <li key={item.href} className="group transition-transform duration-300 hover:-translate-y-2 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 rounded-2xl blur-xl transition-opacity duration-300 group-hover:opacity-100" />
              <Link
                href={item.href}
                className="relative flex h-full flex-col gap-2 rounded-2xl border border-border/40 bg-background/60 backdrop-blur-md p-6 transition-colors group-hover:bg-background/80 group-hover:border-primary/30"
                aria-label={`Navigate to ${item.title}: ${item.description}`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.20em] text-primary">
                    {item.eyebrow} · {item.index}
                  </span>
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </div>
                <p className="font-display font-semibold text-xl leading-tight tracking-tight text-foreground">{item.title}</p>
                <p className="font-sans text-sm text-muted-foreground">{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

