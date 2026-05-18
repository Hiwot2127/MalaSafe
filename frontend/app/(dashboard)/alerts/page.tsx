'use client';

import { useEffect, useState } from 'react';
import { debounce, useQueryStates } from 'nuqs';
import { alertsApi, type AlertsListResponse } from '@/lib/api/alerts';
import { formatDateTime } from '@/lib/utils';
import {
  EditorialCard,
  EditorialInput,
  EditorialSelect,
  Metric,
  PageHeader,
  SectionHeader,
  StatusPill,
  riskLabel,
  riskStatus,
} from '@/components/editorial';
import { Pagination } from '@/components/Pagination';
import {
  pageToSkip,
  parseAsPage,
  parseAsPageSize,
  parseAsString,
  parseAsStringLiteral,
} from '@/lib/url-state';

const ACTIVE_OPTIONS = ['active', 'all'] as const;
const RISK_OPTIONS = ['', 'low', 'moderate', 'high', 'very_high'] as const;

const EMPTY_RESPONSE: AlertsListResponse = {
  alerts: [],
  total: 0,
  active_count: 0,
  high_risk_count: 0,
};

export default function AlertsPage() {
  const [params, setParams] = useQueryStates(
    {
      active: parseAsStringLiteral(ACTIVE_OPTIONS).withDefault('active'),
      risk: parseAsStringLiteral(RISK_OPTIONS).withDefault(''),
      q: parseAsString.withDefault(''),
      page: parseAsPage,
      pageSize: parseAsPageSize(25, 100),
    },
    { history: 'replace' },
  );
  // Local mirror of `q` so the input updates on every keystroke even while
  // the URL - and the network request - debounce behind the scenes.
  const [qLocal, setQLocal] = useState(params.q);
  const [data, setData] = useState<AlertsListResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { active, risk, q, page, pageSize } = params;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    alertsApi
      .getAlerts(
        {
          active_only: active === 'active',
          ...(risk ? { risk_level: risk } : {}),
          ...(q.trim() ? { q: q.trim() } : {}),
          limit: pageSize,
          offset: pageToSkip(page, pageSize),
        },
        { signal: controller.signal },
      )
      .then((response) => setData(response))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const maybe = err as { response?: { data?: { detail?: string } } };
        setError(maybe?.response?.data?.detail || 'Failed to fetch alerts');
        setData(EMPTY_RESPONSE);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [active, risk, q, page, pageSize]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14">
      <PageHeader
        eyebrow="MalaSafe · Outbreak watch"
        title="Alerts"
        description="Standing list of district-level outbreak alerts opened by the surveillance pipeline. Acknowledge from the district console."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <EditorialInput
              type="search"
              value={qLocal}
              placeholder="Search district…"
              aria-label="Search district name"
              className="w-48"
              onChange={(e) => {
                const next = e.target.value;
                setQLocal(next);
                // URL + fetch update is debounced (300 ms) so each keystroke
                // doesn't fire a request or replace history. Reset to page 1
                // on every search change.
                setParams(
                  { q: next, page: 1 },
                  { limitUrlUpdates: debounce(300) },
                );
              }}
            />
            <EditorialSelect
              value={active}
              onChange={(next) =>
                setParams({
                  active: next as (typeof ACTIVE_OPTIONS)[number],
                  page: 1,
                })
              }
              aria-label="Status filter"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'all', label: 'All' },
              ]}
            />
            <EditorialSelect
              value={risk}
              onChange={(next) =>
                setParams({
                  risk: next as (typeof RISK_OPTIONS)[number],
                  page: 1,
                })
              }
              aria-label="Risk filter"
              options={[
                { value: '', label: 'All risk' },
                { value: 'low', label: 'Low' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'high', label: 'High' },
                { value: 'very_high', label: 'Very high' },
              ]}
            />
          </div>
        }
      />

      {/* Section 001 - Summary */}
      <section className="flex flex-col gap-5">
        <SectionHeader
          index="001"
          label="Summary"
          tone={data.high_risk_count > 0 ? 'error' : data.active_count > 0 ? 'warn' : 'valid'}
        >
          <StatusPill
            kind={data.high_risk_count > 0 ? 'error' : data.active_count > 0 ? 'warn' : 'valid'}
          >
            {data.high_risk_count > 0
              ? 'Critical'
              : data.active_count > 0
                ? `${data.active_count} open`
                : 'All clear'}
          </StatusPill>
        </SectionHeader>
        <EditorialCard>
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3">
            <Metric
              eyebrow="Matching"
              value={data.total.toLocaleString()}
              caption="Current filter"
            />
            <Metric
              eyebrow="Active"
              value={data.active_count.toLocaleString()}
              status={data.active_count === 0 ? 'valid' : 'warn'}
              statusLabel={data.active_count === 0 ? 'clear' : 'open'}
            />
            <Metric
              eyebrow="High risk"
              value={data.high_risk_count.toLocaleString()}
              caption="High + very high"
              status={data.high_risk_count === 0 ? 'valid' : 'error'}
              statusLabel={data.high_risk_count === 0 ? 'stable' : 'critical'}
            />
          </div>
        </EditorialCard>
      </section>

      {/* Section 002 - Roster */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="002" label="Roster" tone="signal">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
            {data.total.toLocaleString()} rows
          </span>
        </SectionHeader>

        {loading ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Loading alerts…
          </p>
        ) : error ? (
          <div className="border border-status-error/40 bg-status-error-tint px-4 py-3 font-sans text-sm text-status-error">
            {error}
          </div>
        ) : data.alerts.length === 0 ? (
          <EditorialCard className="px-6 py-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              No alerts found · last checked {formatDateTime(new Date())}
            </p>
          </EditorialCard>
        ) : (
          <EditorialCard className="overflow-hidden">
            <ul className="flex flex-col divide-y divide-border">
              {data.alerts.map((alert, i) => (
                <li
                  key={alert.id}
                  className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-secondary/40"
                >
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {String((page - 1) * pageSize + i + 1).padStart(3, '0')}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <p className="font-display font-semibold text-base leading-tight tracking-tight">
                        {alert.district_name || 'Unknown district'}
                      </p>
                      <StatusPill kind={riskStatus(alert.risk_level)}>
                        {riskLabel(alert.risk_level)}
                      </StatusPill>
                      {alert.is_active ? (
                        <StatusPill kind="neutral">Active</StatusPill>
                      ) : null}
                    </div>
                    <p className="font-sans text-sm text-foreground/85">{alert.message}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                      {alert.region ? `${alert.region} · ` : ''}
                      {formatDateTime(alert.created_at)}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
                  >
                    {alert.risk_level === 'very_high'
                      ? '★★'
                      : alert.risk_level === 'high'
                        ? '★'
                        : '·'}
                  </span>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={data.total}
              unit="alerts"
              onChange={(next) => setParams({ page: next })}
            />
          </EditorialCard>
        )}
      </section>
    </div>
  );
}
