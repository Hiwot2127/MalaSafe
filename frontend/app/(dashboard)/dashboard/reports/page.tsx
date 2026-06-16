'use client';

import { useEffect, useState } from 'react';
import { useQueryState } from 'nuqs';
import { Activity, FileText, ShieldAlert } from 'lucide-react';
import { reportsApi } from '@/lib/api/reports';
import type { ReportsOverview } from '@/types/reports';
import { parseAsString } from '@/lib/url-state';
import {
  AlertBanner,
  EditorialCard,
  EditorialSelect,
  EmptyState,
  LoadingScreen,
  PageHeader,
  SectionHeader,
  StatCard,
} from '@/components/editorial';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS: { value: string; label: string }[] = Array.from({ length: 6 }, (_, i) => {
  const y = String(CURRENT_YEAR - i);
  return { value: y, label: y };
});

export default function ReportsPage() {
  const [year, setYear] = useQueryState(
    'year',
    parseAsString.withDefault(String(CURRENT_YEAR - 1)), // Default to last year with data
  );
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    reportsApi
      .getOverview(Number(year))
      .then((overview) => {
        if (controller.signal.aborted) return;
        setData(overview);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const maybe = err as { response?: { data?: { detail?: string } } };
        setError(maybe?.response?.data?.detail || 'Failed to load report');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [year]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <PageHeader
          eyebrow="MalaSafe · Reports"
          title="Annual surveillance report"
          description="Caseload and alerting posture by year and region."
        />
        <LoadingScreen caption="Compiling report" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 animate-fade-in">
      <PageHeader
        eyebrow="MalaSafe · Reports"
        title="Annual Surveillance Report"
        description={`Comprehensive malaria surveillance overview for ${year}. Includes caseload trends, regional breakdowns, and risk assessment summary.`}
        actions={
          <EditorialSelect
            value={year}
            onChange={setYear}
            options={YEARS}
            aria-label="Reporting year"
          />
        }
      />

      {error ? (
        <AlertBanner tone="error" title="Couldn't load the report" description={error} />
      ) : null}

      {data ? (
        <>
          {/* Overview */}
          <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <SectionHeader index="001" label="Overview" tone="signal">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Year {data.year} {Number(data.year) < CURRENT_YEAR ? '· Historical' : ''}
              </span>
            </SectionHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              eyebrow="Total cases"
              value={data.total_positive.toLocaleString()}
              caption={`Reporting year ${data.year}`}
              icon={FileText}
              tone="signal"
              help="Total confirmed malaria cases reported across all districts during this year"
            />
            <StatCard
              eyebrow="Active alerts"
              value={data.active_alerts.toLocaleString()}
              caption={data.active_alerts === 0 ? 'All clear' : 'Open right now'}
              icon={Activity}
              tone={data.active_alerts === 0 ? 'valid' : 'warn'}
              help="Current number of outbreak alerts requiring attention"
            />
            <StatCard
              eyebrow="High-risk districts"
              value={data.high_risk_districts.toLocaleString()}
              caption="Elevated level"
              icon={ShieldAlert}
              tone={data.high_risk_districts === 0 ? 'valid' : 'error'}
              help="Districts classified as high or very high risk based on recent predictions"
            />
            </div>
          </section>

          {/* Monthly trend */}
          <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <SectionHeader index="002" label="Monthly trend" tone="signal">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {data.year} · {data.monthly_trend.length} months
              </span>
            </SectionHeader>
            {data.monthly_trend.length === 0 ? (
              <EmptyState
                title="No monthly data yet"
                description="The model hasn't received case data for this year. Upload a monthly malaria CSV to seed the trend."
              />
            ) : (
              <EditorialCard className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-secondary/40 text-muted-foreground">
                      <tr>
                        <Th>Period</Th>
                        <Th align="right">Cases</Th>
                        <Th align="right">% of Year</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly_trend.map((row) => {
                        const pct = data.total_positive > 0 
                          ? ((row.positive / data.total_positive) * 100).toFixed(1)
                          : '0.0';
                        return (
                          <tr
                            key={row.period}
                            className="border-b border-border/70 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <Td className="font-mono text-xs tabular-nums">{row.period}</Td>
                            <Td align="right" className="tabular-nums font-medium">
                              {row.positive.toLocaleString()}
                            </Td>
                            <Td align="right" className="tabular-nums text-muted-foreground">
                              {pct}%
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-border bg-secondary/20">
                      <tr>
                        <Td className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                          Total
                        </Td>
                        <Td align="right" className="tabular-nums font-bold">
                          {data.total_positive.toLocaleString()}
                        </Td>
                        <Td align="right" className="tabular-nums font-bold">
                          100%
                        </Td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </EditorialCard>
            )}
          </section>

          {/* By region */}
          <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <SectionHeader index="003" label="Regional breakdown" tone="signal">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {data.by_region.length.toLocaleString()} regions
              </span>
            </SectionHeader>
            <EditorialCard className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-secondary/40 text-muted-foreground">
                    <tr>
                      <Th>Region</Th>
                      <Th align="right">Districts</Th>
                      <Th align="right">High-risk</Th>
                      <Th align="right">Cases</Th>
                      <Th align="right">% of Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_region
                      .sort((a, b) => b.total_positive - a.total_positive)
                      .map((row) => {
                        const pct = data.total_positive > 0
                          ? ((row.total_positive / data.total_positive) * 100).toFixed(1)
                          : '0.0';
                        const hasHighRisk = row.high_risk_count > 0;
                        return (
                          <tr
                            key={row.region}
                            className="border-b border-border/70 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <Td className="font-sans text-foreground font-medium">{row.region}</Td>
                            <Td align="right" className="tabular-nums">
                              {row.districts_count.toLocaleString()}
                            </Td>
                            <Td align="right" className="tabular-nums">
                              <span className={hasHighRisk ? 'text-status-error font-medium' : 'text-muted-foreground'}>
                                {row.high_risk_count.toLocaleString()}
                              </span>
                            </Td>
                            <Td align="right" className="tabular-nums font-medium">
                              {row.total_positive.toLocaleString()}
                            </Td>
                            <Td align="right" className="tabular-nums text-muted-foreground">
                              {pct}%
                            </Td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-secondary/20">
                    <tr>
                      <Td className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        Total
                      </Td>
                      <Td align="right" className="tabular-nums font-bold">
                        {data.by_region.reduce((sum, r) => sum + r.districts_count, 0).toLocaleString()}
                      </Td>
                      <Td align="right" className="tabular-nums font-bold">
                        {data.by_region.reduce((sum, r) => sum + r.high_risk_count, 0).toLocaleString()}
                      </Td>
                      <Td align="right" className="tabular-nums font-bold">
                        {data.total_positive.toLocaleString()}
                      </Td>
                      <Td align="right" className="tabular-nums font-bold">
                        100%
                      </Td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </EditorialCard>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      className={`px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = '',
  align = 'left',
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <td
      className={`px-5 py-3 ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
    >
      {children}
    </td>
  );
}
