'use client';

import { useEffect, useMemo, useState } from 'react';
import { alertsApi } from '@/lib/api/alerts';
import { Alert } from '@/types/map';
import { formatDateTime } from '@/lib/utils';
import {
  EditorialCard,
  EditorialSelect,
  Metric,
  PageHeader,
  SectionHeader,
  StatusPill,
  riskLabel,
  riskStatus,
} from '@/components/editorial';

type ActiveFilter = 'all' | 'active' | 'inactive';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<ActiveFilter>('active');
  const [filterRisk, setFilterRisk] = useState<string>('');

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, unknown> = {};
        if (filterActive !== 'all') params.is_active = filterActive === 'active';
        if (filterRisk) params.risk_level = filterRisk;
        const response = await alertsApi.getAlerts(params);
        // Backend may return either a bare array or { data: [...] } / { items: [...] }.
        const list: Alert[] = Array.isArray(response)
          ? response
          : ((response as unknown as { data?: Alert[]; items?: Alert[] })?.data ??
              (response as unknown as { items?: Alert[] })?.items ??
              []);
        setAlerts(list);
      } catch (err: unknown) {
        const maybe = err as { response?: { data?: { detail?: string } } };
        setError(maybe?.response?.data?.detail || 'Failed to fetch alerts');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [filterActive, filterRisk]);

  const totals = useMemo(() => {
    return {
      total: alerts.length,
      active: alerts.filter((a) => a.is_active).length,
      highRisk: alerts.filter(
        (a) => a.risk_level === 'high' || a.risk_level === 'very_high',
      ).length,
      veryHigh: alerts.filter((a) => a.risk_level === 'very_high').length,
    };
  }, [alerts]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14">
      <PageHeader
        eyebrow="MalaSafe · Outbreak watch"
        title="Alerts"
        description="Standing list of district-level outbreak alerts opened by the surveillance pipeline. Acknowledge from the district console."
        actions={
          <div className="flex items-center gap-2">
            <EditorialSelect
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as ActiveFilter)}
              aria-label="Status filter"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </EditorialSelect>
            <EditorialSelect
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              aria-label="Risk filter"
            >
              <option value="">All risk</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="very_high">Very high</option>
            </EditorialSelect>
          </div>
        }
      />

      {/* Section 001 — Summary */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="001" label="Summary">
          <StatusPill kind={totals.veryHigh > 0 ? 'error' : totals.active > 0 ? 'warn' : 'valid'}>
            {totals.veryHigh > 0
              ? 'Critical'
              : totals.active > 0
                ? `${totals.active} open`
                : 'All clear'}
          </StatusPill>
        </SectionHeader>
        <EditorialCard>
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            <Metric
              eyebrow="Total alerts"
              value={totals.total.toLocaleString()}
              caption="In window"
            />
            <Metric
              eyebrow="Active"
              value={totals.active.toLocaleString()}
              status={totals.active === 0 ? 'valid' : 'warn'}
              statusLabel={totals.active === 0 ? 'clear' : 'open'}
            />
            <Metric
              eyebrow="High risk"
              value={totals.highRisk.toLocaleString()}
              caption="High + very high"
              status={totals.highRisk === 0 ? 'valid' : 'warn'}
              statusLabel={totals.highRisk === 0 ? 'stable' : 'watch'}
            />
            <Metric
              eyebrow="Very high"
              value={totals.veryHigh.toLocaleString()}
              caption="Critical districts"
              status={totals.veryHigh === 0 ? 'valid' : 'error'}
              statusLabel={totals.veryHigh === 0 ? 'stable' : 'critical'}
            />
          </div>
        </EditorialCard>
      </section>

      {/* Section 002 — Active alerts */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="002" label="Roster">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
            {totals.total} rows
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
        ) : alerts.length === 0 ? (
          <EditorialCard className="px-6 py-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              No alerts found · last checked {formatDateTime(new Date())}
            </p>
          </EditorialCard>
        ) : (
          <EditorialCard className="overflow-hidden">
            <ul className="flex flex-col divide-y divide-border">
              {alerts.map((alert, i) => (
                <li
                  key={alert.id}
                  className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-secondary/40"
                >
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(3, '0')}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <p className="font-display text-base leading-tight tracking-tight">
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
                  <span aria-hidden className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {alert.risk_level === 'very_high' ? '★★' : alert.risk_level === 'high' ? '★' : '·'}
                  </span>
                </li>
              ))}
            </ul>
          </EditorialCard>
        )}
      </section>
    </div>
  );
}
