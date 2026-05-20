'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { analyticsApi } from '@/lib/api/analytics';
import { DashboardSummary } from '@/types/analytics';
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

const QUICK_LINKS = [
  {
    index: '01',
    eyebrow: 'Ingest',
    title: 'Upload data',
    description: 'Drop a malaria or climate CSV.',
    href: '/upload',
  },
  {
    index: '02',
    eyebrow: 'Surface',
    title: 'Risk maps',
    description: 'District-level heat at a glance.',
    href: '/maps',
  },
  {
    index: '03',
    eyebrow: 'Series',
    title: 'Analytics',
    description: 'Weekly and monthly trends.',
    href: '/analytics',
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await analyticsApi.getDashboard();
        setStats(response.summary);
      } catch (err: unknown) {
        const maybe = err as { response?: { data?: { detail?: string } } };
        setError(maybe?.response?.data?.detail || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <PageHeader
          eyebrow="MalaSafe · Overview"
          title="Surveillance dashboard"
          description="Current period summary, drift posture, and latest close."
        />
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Loading dashboard…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <PageHeader
          eyebrow="MalaSafe · Overview"
          title="Surveillance dashboard"
        />
        <div className="border border-status-error/40 bg-status-error-tint px-4 py-3 font-sans text-sm text-status-error">
          {error}
        </div>
      </div>
    );
  }

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

  // Thresholds scale with population — 5 alerts is "critical" for a 50-
  // district pilot but routine at country scale. Use ratios so the badge
  // tracks the data instead of fixed magic numbers. (Dataset currently
  // covers ~1,082 districts.)
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
    <div className="mx-auto flex max-w-6xl flex-col gap-14">
      <PageHeader
        eyebrow={`MalaSafe · ${period}`}
        title="Surveillance dashboard"
        description="A standing read on caseload, alerting posture, and risk concentration. Numbers update with each monthly close."
      />

      {/* Posture alert hero - leads with the most actionable signal. */}
      <AlertCard
        tone={postureStatus}
        eyebrow={alertEyebrow}
        title={postureLabel}
        stats={alertStats}
        description={alertDescription}
        cta={activeAlerts > 0 ? { label: 'Review alerts', href: '/alerts' } : undefined}
      />

      {/* Section 001 - Indicators + Posture */}
      <section className="flex flex-col gap-5">
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
        <EditorialCard>
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3">
            <Metric
              eyebrow="Total cases"
              value={cases.toLocaleString()}
              caption={`Reported · ${periodLabel}`}
              help={
                methodology.total_cases ||
                `Sum of MalariaData.positive reported for ${periodLabel} (uploaded CSV data, not predicted).`
              }
            />
            <Metric
              eyebrow="Active alerts"
              value={activeAlerts.toLocaleString()}
              caption={activeAlerts === 0 ? 'All clear' : 'Open'}
              status={activeAlerts === 0 ? 'valid' : activeAlerts > 3 ? 'error' : 'warn'}
              statusLabel={activeAlerts === 0 ? 'clear' : activeAlerts > 3 ? 'critical' : 'attention'}
              help={
                methodology.active_alerts ||
                'Count of currently-active alerts across the dataset (no age filter).'
              }
            />
            <Metric
              eyebrow="High risk districts"
              value={highRisk.toLocaleString()}
              caption={`Forecast HIGH/VERY HIGH · last ${predWindow}d`}
              status={highRisk === 0 ? 'valid' : highRisk > 5 ? 'error' : 'warn'}
              statusLabel={highRisk === 0 ? 'stable' : highRisk > 5 ? 'critical' : 'watch'}
              help={
                methodology.high_risk_districts ||
                `Distinct districts whose latest model prediction in the last ${predWindow} days lands in the HIGH or VERY_HIGH bucket. Forecast, not observed.`
              }
            />
          </div>
        </EditorialCard>
        <EditorialCard className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
          <div className="bg-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Caseload signal
            </p>
            <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
              Aggregated positive case counts across the reporting window.
            </p>
          </div>
          <div className="bg-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Geographic concentration
            </p>
            <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
              {activeAlerts.toLocaleString()} active alerts open against the current close.
              Open the risk surface to drill into a region.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/maps"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-secondary/40"
              >
                View risk surface
                <ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden />
              </Link>
              {activeAlerts > 0 ? (
                <Link
                  href="/alerts"
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-primary px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:opacity-90"
                >
                  Review alerts
                  <ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>
        </EditorialCard>
        {/* Version + threshold provenance. Lets reviewers audit which model
            and threshold package produced the numbers above. */}
        {(modelVersion || thresholdsVersion || riskThresholds) && (
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
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

      {/* Section 002 - Operational checklist */}
      <section className="flex flex-col gap-5">
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

      {/* Section 003 - Jump to */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="003" label="Jump to" tone="signal" />
        <ul className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3">
          {QUICK_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex h-full flex-col gap-2 bg-card p-6 transition-colors hover:bg-secondary/40"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {item.eyebrow} · {item.index}
                  </span>
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </div>
                <p className="font-display font-semibold text-xl leading-tight tracking-tight">{item.title}</p>
                <p className="font-sans text-sm text-muted-foreground">{item.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
