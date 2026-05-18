'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { analyticsApi } from '@/lib/api/analytics';
import { DashboardSummary } from '@/types/analytics';
import {
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

  const cases = stats?.total_cases ?? 0;
  const deaths = stats?.total_deaths ?? 0;
  const activeAlerts = stats?.active_alerts ?? 0;
  const highRisk = stats?.high_risk_districts ?? 0;
  const cfr = stats?.case_fatality_rate ?? 0;
  const period = stats?.period || 'Current period';

  const postureStatus: 'valid' | 'warn' | 'error' =
    activeAlerts === 0 && highRisk === 0
      ? 'valid'
      : highRisk > 5 || activeAlerts > 3
        ? 'error'
        : 'warn';
  const postureLabel =
    postureStatus === 'valid'
      ? 'Stable posture'
      : postureStatus === 'error'
        ? 'Critical posture — review now'
        : 'Monitoring posture';

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14">
      <PageHeader
        eyebrow={`MalaSafe · ${period}`}
        title="Surveillance dashboard"
        description="A standing read on caseload, mortality, alerting posture, and risk concentration. Numbers update with each monthly close."
      />

      {/* Navy hero — sets the color tone of the application. */}
      <section className="relative flex flex-col gap-6 overflow-hidden bg-primary p-8 text-primary-foreground sm:p-10">
        <span aria-hidden className="absolute inset-y-6 left-0 w-[3px] bg-accent-signal" />
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-70">
            MalaSafe · Current posture
          </p>
          <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.022em] sm:text-5xl">
            {postureLabel}
          </h2>
          <p className="max-w-prose font-sans text-base leading-relaxed opacity-85">
            {cases.toLocaleString()} cases recorded across the {period} reporting window
            against {deaths.toLocaleString()} deaths (CFR {cfr.toFixed(2)}%).{' '}
            {activeAlerts > 0
              ? `${activeAlerts.toLocaleString()} alerts open, ${highRisk.toLocaleString()} districts on watch.`
              : 'No alerts open at this time.'}
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-6 border-t border-primary-foreground/15 pt-6 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">Cases</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums tracking-[-0.022em]">
              {cases.toLocaleString()}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">Deaths</dt>
            <dd className="font-display text-2xl font-semibold tabular-nums tracking-[-0.022em]">
              {deaths.toLocaleString()}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">
              Active alerts
            </dt>
            <dd className="font-display text-2xl font-semibold tabular-nums tracking-[-0.022em]">
              {activeAlerts.toLocaleString()}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">
              High-risk districts
            </dt>
            <dd className="font-display text-2xl font-semibold tabular-nums tracking-[-0.022em]">
              {highRisk.toLocaleString()}
            </dd>
          </div>
        </dl>
      </section>

      {/* Section 001 — Indicators */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="001" label="Indicators" tone="signal">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {period}
          </span>
        </SectionHeader>
        <EditorialCard>
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            <Metric
              eyebrow="Total cases"
              value={cases.toLocaleString()}
              caption={period}
            />
            <Metric
              eyebrow="Total deaths"
              value={deaths.toLocaleString()}
              caption={`CFR ${cfr.toFixed(2)}%`}
            />
            <Metric
              eyebrow="Active alerts"
              value={activeAlerts.toLocaleString()}
              caption={activeAlerts === 0 ? 'All clear' : 'Open'}
              status={activeAlerts === 0 ? 'valid' : activeAlerts > 3 ? 'error' : 'warn'}
              statusLabel={activeAlerts === 0 ? 'clear' : activeAlerts > 3 ? 'critical' : 'attention'}
            />
            <Metric
              eyebrow="High risk districts"
              value={highRisk.toLocaleString()}
              caption="Elevated level"
              status={highRisk === 0 ? 'valid' : highRisk > 5 ? 'error' : 'warn'}
              statusLabel={highRisk === 0 ? 'stable' : highRisk > 5 ? 'critical' : 'watch'}
            />
          </div>
        </EditorialCard>
      </section>

      {/* Section 002 — Posture */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="002" label="Posture" tone={postureStatus}>
          <StatusPill kind={postureStatus}>
            {postureStatus === 'valid'
              ? 'Stable'
              : postureStatus === 'error'
                ? 'Critical'
                : 'Monitoring'}
          </StatusPill>
        </SectionHeader>
        <EditorialCard className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
          <div className="bg-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Caseload signal
            </p>
            <p className="mt-3 font-display font-semibold text-2xl leading-tight tracking-tight">
              {cases.toLocaleString()}{' '}
              <span className="font-sans text-base text-muted-foreground">cases / {period}</span>
            </p>
            <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
              Case fatality ratio of {cfr.toFixed(2)}% across the reporting window.
              CFR &gt; 1% triggers an automatic flag to the district lead.
            </p>
          </div>
          <div className="bg-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Geographic concentration
            </p>
            <p className="mt-3 font-display font-semibold text-2xl leading-tight tracking-tight">
              {highRisk.toLocaleString()}{' '}
              <span className="font-sans text-base text-muted-foreground">
                high-risk districts
              </span>
            </p>
            <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
              {activeAlerts.toLocaleString()} active alerts open against the current close.
              Open the risk surface to drill into a region.
            </p>
            <Link
              href="/maps"
              className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:text-muted-foreground"
            >
              View risk surface
              <ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
        </EditorialCard>
      </section>

      {/* Section 003 — Jump to */}
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
