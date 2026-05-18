'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, Loader2 } from 'lucide-react';
import { alertsApi } from '@/lib/api/alerts';
import { Alert } from '@/types/map';
import { formatDateTime, getApiErrorMessage, getRiskBadgeColor } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';

function riskIconClass(level: string): string {
  if (level === 'very_high') return 'bg-red-500/10 text-red-600 dark:text-red-400';
  if (level === 'high') return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
  if (level === 'medium' || level === 'moderate') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(true);
  const [filterRisk, setFilterRisk] = useState<string>('');

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: { is_active?: boolean; risk_level?: string } = {};
        if (filterActive !== undefined) params.is_active = filterActive;
        if (filterRisk) params.risk_level = filterRisk;
        const response = await alertsApi.getAlerts(params);
        setAlerts(response);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to fetch alerts'));
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [filterActive, filterRisk]);

  const activeCount = alerts.filter((a) => a.is_active).length;
  const highRiskCount = alerts.filter(
    (a) => a.risk_level === 'high' || a.risk_level === 'very_high'
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Alerts"
        description="Malaria outbreak alerts and risk notifications"
        icon={Bell}
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              value={filterActive === undefined ? 'all' : filterActive ? 'active' : 'inactive'}
              onChange={(e) => {
                const value = e.target.value;
                setFilterActive(value === 'all' ? undefined : value === 'active');
              }}
              className="ms-select min-w-[140px]"
            >
              <option value="all">All alerts</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="ms-select min-w-[160px]"
            >
              <option value="">All risk levels</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="very_high">Very high</option>
            </select>
          </div>
        }
      />

      {loading && (
        <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading alerts…
        </div>
      )}

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {!loading && !error && alerts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total alerts" value={alerts.length} icon={Bell} variant="blue" />
          <StatCard label="Active alerts" value={activeCount} icon={AlertTriangle} variant="amber" />
          <StatCard label="High risk" value={highRiskCount} icon={AlertTriangle} variant="red" />
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <EmptyState
          icon={Bell}
          title="No alerts found"
          description="Alerts appear when districts exceed risk thresholds in the surveillance system."
        />
      )}

      {!loading && !error && alerts.length > 0 && (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <article key={alert.id} className="ms-card p-5 transition-shadow hover:shadow-md">
              <div className="flex gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${riskIconClass(alert.risk_level)}`}
                >
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {alert.district_name || 'Unknown district'}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRiskBadgeColor(alert.risk_level)}`}
                    >
                      {alert.risk_level.replace('_', ' ')}
                    </span>
                    {alert.is_active && (
                      <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {alert.region && <span>Region: {alert.region}</span>}
                    <span>Created: {formatDateTime(alert.created_at)}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
