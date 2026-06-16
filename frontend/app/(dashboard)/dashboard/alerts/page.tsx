'use client';

import { useEffect, useState } from 'react';
import { debounce, useQueryStates } from 'nuqs';
import { alertsApi, type AlertsListResponse } from '@/lib/api/alerts';
import { analyticsApi } from '@/lib/api/analytics';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, X } from 'lucide-react';
import {
  AlertBanner,
  EditorialCard,
  EditorialInput,
  EditorialSelect,
  EmptyState,
  LoadingScreen,
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
      region: parseAsString.withDefault(''),
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
  const [regions, setRegions] = useState<Array<{ value: string; label: string }>>([
    { value: '', label: 'All regions' }
  ]);

  const { active, risk, region, q, page, pageSize } = params;

  // Fetch available regions from analytics API
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await analyticsApi.getDashboard({ year: 2025 });
        if (response.by_region && response.by_region.length > 0) {
          const regionOptions = [
            { value: '', label: 'All regions' },
            ...response.by_region
              .map(r => ({ value: r.region, label: r.region }))
              .sort((a, b) => a.label.localeCompare(b.label))
          ];
          setRegions(regionOptions);
        }
      } catch (err) {
        console.error('Failed to fetch regions:', err);
      }
    };
    fetchRegions();
  }, []);

  // Check if any filters are active
  const hasActiveFilters = active !== 'active' || risk !== '' || region !== '' || q !== '';

  const clearFilters = () => {
    setQLocal('');
    setParams({
      active: 'active',
      risk: '',
      region: '',
      q: '',
      page: 1,
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    alertsApi
      .getAlerts(
        {
          active_only: active === 'active',
          ...(risk ? { risk_level: risk } : {}),
          ...(region ? { region } : {}),
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
  }, [active, risk, region, q, page, pageSize]);

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
              value={region}
              onChange={(next) =>
                setParams({
                  region: next,
                  page: 1,
                })
              }
              aria-label="Region filter"
              contentWidth="auto"
              options={regions}
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
                { value: 'active', label: 'Active only' },
                { value: 'all', label: 'All status' },
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
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/60 hover:bg-secondary/50 hover:text-foreground"
                aria-label="Clear all filters"
              >
                <X className="size-3" strokeWidth={2} aria-hidden />
                Clear
              </button>
            )}
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
            {hasActiveFilters && ' · filtered'}
          </span>
        </SectionHeader>

        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-secondary/20 p-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Active filters:
            </span>
            {q && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
                <span className="text-muted-foreground">Search:</span>
                <span className="font-semibold">{q}</span>
                <button
                  type="button"
                  onClick={() => {
                    setQLocal('');
                    setParams({ q: '', page: 1 });
                  }}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3" strokeWidth={2} />
                </button>
              </div>
            )}
            {region && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
                <span className="text-muted-foreground">Region:</span>
                <span className="font-semibold">{regions.find(r => r.value === region)?.label || region}</span>
                <button
                  type="button"
                  onClick={() => setParams({ region: '', page: 1 })}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear region filter"
                >
                  <X className="size-3" strokeWidth={2} />
                </button>
              </div>
            )}
            {active === 'all' && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold">All status</span>
                <button
                  type="button"
                  onClick={() => setParams({ active: 'active', page: 1 })}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  aria-label="Show active only"
                >
                  <X className="size-3" strokeWidth={2} />
                </button>
              </div>
            )}
            {risk && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
                <span className="text-muted-foreground">Risk:</span>
                <span className="font-semibold capitalize">{risk.replace('_', ' ')}</span>
                <button
                  type="button"
                  onClick={() => setParams({ risk: '', page: 1 })}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear risk filter"
                >
                  <X className="size-3" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <LoadingScreen caption="Loading alerts" />
        ) : error ? (
          <AlertBanner tone="error" title="Couldn't load alerts" description={error} />
        ) : data.alerts.length === 0 ? (
          <EmptyState
            eyebrow={hasActiveFilters ? 'No results' : 'All clear'}
            title={
              hasActiveFilters
                ? 'No alerts match your filters'
                : active === 'active'
                  ? 'No active alerts'
                  : 'No alerts in the system'
            }
            description={
              hasActiveFilters
                ? `Try adjusting the ${[region && 'region', risk && 'risk level', q && 'search term', active === 'all' && 'status'].filter(Boolean).join(', ')} or click "Clear" above.`
                : active === 'active'
                  ? 'The surveillance system shows no active outbreak alerts. All districts are within expected thresholds.'
                  : 'No historical alerts found. Upload monthly data to begin surveillance.'
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {data.alerts.map((alert, i) => {
              const tone = riskStatus(alert.risk_level);
              const banner = tone === 'neutral' ? 'info' : tone;
              const index = String((page - 1) * pageSize + i + 1).padStart(3, '0');
              const meta = [alert.region, formatDateTime(alert.created_at)]
                .filter(Boolean)
                .join(' · ');
              return (
                <AlertBanner
                  key={alert.id}
                  tone={banner}
                  title={`${index} · ${alert.district_name || 'Unknown district'}`}
                  description={
                    <div className="flex flex-col gap-1.5">
                      <p className="text-foreground/90">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill kind={riskStatus(alert.risk_level)}>
                          {riskLabel(alert.risk_level)}
                        </StatusPill>
                        {alert.is_active ? (
                          <StatusPill kind="neutral">Active</StatusPill>
                        ) : null}
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                          {meta}
                        </span>
                      </div>
                    </div>
                  }
                  action={
                    alert.district_id ? (
                      <Link
                        href={`/dashboard/predictions?district=${alert.district_id}`}
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:text-muted-foreground"
                      >
                        View district
                        <ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden />
                      </Link>
                    ) : undefined
                  }
                />
              );
            })}
            <EditorialCard className="overflow-hidden p-0">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={data.total}
                unit="alerts"
                onChange={(next) => setParams({ page: next })}
              />
            </EditorialCard>
          </div>
        )}
      </section>
    </div>
  );
}
