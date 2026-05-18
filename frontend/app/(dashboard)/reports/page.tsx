'use client';

import { useEffect, useState } from 'react';
import { FileText, Printer } from 'lucide-react';
import { reportsApi } from '@/lib/api/reports';
import type { ReportsOverview } from '@/types/reports';
import { formatDateTime, getApiErrorMessage } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { AlertBanner } from '@/components/ui/alert-banner';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { StatCard } from '@/components/ui/stat-card';
import { Activity, AlertTriangle, Map } from 'lucide-react';

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await reportsApi.getOverview(year);
        setData(res);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to load report'));
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year]);

  const handlePrint = () => window.print();

  if (loading) {
    return <LoadingScreen message="Building report…" />;
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          description="Consolidated surveillance overview for planning and briefings"
          icon={FileText}
        />
        <AlertBanner variant="error">{error || 'No report data available'}</AlertBanner>
      </div>
    );
  }

  const s = data.summary;
  const meta = data.risk_map_metadata ?? {};
  const alerts = data.alerts_snapshot ?? { total: 0, active_count: 0, high_risk_count: 0 };

  return (
    <div className="space-y-8 print:space-y-4">
      <PageHeader
        title="Reports"
        description="Consolidated surveillance overview for planning and briefings"
        icon={FileText}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="ms-select"
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="button" onClick={handlePrint} className="ms-btn-secondary inline-flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print / PDF
            </button>
          </div>
        }
      />

      <article className="ms-card p-8 print:border-0 print:shadow-none">
        <header className="mb-8 border-b border-border pb-6">
          <h2 className="text-2xl font-bold text-foreground">MalaSafe surveillance report</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generated {formatDateTime(data.generated_at)} · Period focus: {s.period}
          </p>
        </header>

        <section className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Summary indicators</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total cases" value={s.total_cases} icon={Activity} variant="blue" />
            <StatCard label="Total deaths" value={s.total_deaths} icon={Activity} variant="red" />
            <StatCard
              label="Case fatality rate"
              value={`${s.case_fatality_rate?.toFixed(2) ?? '0.00'}%`}
              icon={Activity}
              variant="amber"
            />
            <StatCard label="High-risk districts" value={s.high_risk_districts} icon={Map} variant="violet" />
          </div>
        </section>

        <section className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/20 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Alerts snapshot
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Total alerts (all time): {alerts.total}</li>
              <li>Active alerts: {alerts.active_count}</li>
              <li>Active high / very high risk: {alerts.high_risk_count}</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Map className="h-5 w-5 text-primary" />
              Risk map snapshot
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Districts with risk data: {meta.total_districts ?? 0}</li>
              <li>High + very high risk: {meta.high_risk ?? 0}</li>
              <li>Moderate risk: {meta.moderate_risk ?? 0}</li>
              <li>Low risk: {meta.low_risk ?? 0}</li>
              {meta.date_filter && <li>Map date filter: {meta.date_filter}</li>}
            </ul>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Monthly trend preview ({year})
          </h3>
          {(data.monthly_trends?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No monthly malaria aggregates for this year yet.
            </p>
          ) : (
            <div className="ms-table-wrap">
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="text-right">Cases</th>
                    <th className="text-right">Deaths</th>
                    <th className="text-right">CFR %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monthly_trends.map((row, i) => (
                    <tr key={`${row.period}-${i}`}>
                      <td className="font-medium">{row.period}</td>
                      <td className="text-right tabular-nums">{row.cases.toLocaleString()}</td>
                      <td className="text-right tabular-nums">{row.deaths.toLocaleString()}</td>
                      <td className="text-right tabular-nums">{row.case_fatality_rate?.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          MalaSafe — Ethiopia malaria surveillance. This report is generated from live system data.
        </footer>
      </article>
    </div>
  );
}
