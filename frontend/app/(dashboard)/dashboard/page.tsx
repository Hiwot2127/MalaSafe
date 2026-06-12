'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useDashboard } from '@/lib/api/queries';
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
} from '@/components/editorial';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { DashboardError } from '@/components/dashboard/dashboard-error';

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

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error as Error} onRetry={refetch} />;
  if (!data) return null;

  const stats = data.summary;
  const cases = stats?.total_positive ?? 0;
  const activeAlerts = stats?.active_alerts ?? 0;
  const highRisk = stats?.high_risk_districts ?? 0;
  const period = stats?.period || 'Current period';
  const periodLabel = stats?.period_label || period;
  const predWindow = stats?.prediction_window_days ?? 30;
  const methodology = stats?.methodology ?? {};
  const riskThresholds = stats?.risk_thresholds ?? null;
  const modelVersion = stats?.model_version ?? null;
  const thresholdsVersion = stats?.thresholds_version ?? null;

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
        description="A standing read on caseload, alerting posture, and risk concentration. Numbers update with each monthly close."
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
              <p className="mt-4 font-display text-4xl font-bold tracking-tight text-gradient" data-testid="total-cases-value">{cases.toLocaleString()}</p>
              <div className="mt-4 h-12 w-full opacity-60 transition-opacity group-hover:opacity-100">
                <svg viewBox="0 0 100 30" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                  <path d="M0,25 Q10,20 20,25 T40,15 T60,20 T80,5 T100,10" fill="none" stroke="currentColor" className="text-primary" strokeWidth="2" strokeLinecap="round" />
                  <path d="M0,25 Q10,20 20,25 T40,15 T60,20 T80,5 T100,10 L100,30 L0,30 Z" fill="url(#sparkline-gradient-1)" opacity="0.2" />
                  <defs>
                    <linearGradient id="sparkline-gradient-1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" className="text-primary" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <p className="mt-4 font-sans text-xs text-muted-foreground">{periodLabel}</p>
            </div>

            <div className="relative p-6 overflow-hidden group" data-testid="kpi-card">
              <div className="absolute inset-0 bg-gradient-to-br from-status-error/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="flex items-start justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Active alerts</p>
                <StatusPill kind={activeAlerts === 0 ? 'valid' : activeAlerts > 3 ? 'error' : 'warn'}>
                  {activeAlerts === 0 ? 'Clear' : 'Open'}
                </StatusPill>
              </div>
              <p className="mt-4 font-display text-4xl font-bold tracking-tight">{activeAlerts.toLocaleString()}</p>
              <div className="mt-4 h-12 w-full opacity-60 transition-opacity group-hover:opacity-100">
                <svg viewBox="0 0 100 30" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                  <path d="M0,10 Q10,15 20,10 T40,20 T60,15 T80,25 T100,5" fill="none" stroke="currentColor" className={activeAlerts > 0 ? "text-status-error" : "text-status-valid"} strokeWidth="2" strokeLinecap="round" />
                  <path d="M0,10 Q10,15 20,10 T40,20 T60,15 T80,25 T100,5 L100,30 L0,30 Z" fill="url(#sparkline-gradient-2)" opacity="0.2" />
                  <defs>
                    <linearGradient id="sparkline-gradient-2" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" className={activeAlerts > 0 ? "text-status-error" : "text-status-valid"} />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <p className="mt-4 font-sans text-xs text-muted-foreground">Across dataset</p>
            </div>

            <div className="relative p-6 overflow-hidden group" data-testid="kpi-card">
              <div className="absolute inset-0 bg-gradient-to-br from-status-warn/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="flex items-start justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">High risk districts</p>
                <StatusPill kind={highRisk === 0 ? 'valid' : highRisk > 5 ? 'error' : 'warn'}>
                  {highRisk === 0 ? 'Stable' : 'Watch'}
                </StatusPill>
              </div>
              <p className="mt-4 font-display text-4xl font-bold tracking-tight">{highRisk.toLocaleString()}</p>
              <div className="mt-4 h-12 w-full opacity-60 transition-opacity group-hover:opacity-100">
                <svg viewBox="0 0 100 30" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                  <path d="M0,25 L20,25 L40,15 L60,15 L80,5 L100,10" fill="none" stroke="currentColor" className="text-status-warn" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M0,25 L20,25 L40,15 L60,15 L80,5 L100,10 L100,30 L0,30 Z" fill="url(#sparkline-gradient-3)" opacity="0.2" />
                  <defs>
                    <linearGradient id="sparkline-gradient-3" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" className="text-status-warn" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <p className="mt-4 font-sans text-xs text-muted-foreground">Forecast last {predWindow}d</p>
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

