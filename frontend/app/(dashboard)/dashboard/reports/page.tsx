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
const YEARS: { value: string; label: string }[] = Array.from({ length: 4 }, (_, i) => {
  const y = String(CURRENT_YEAR - i);
  return { value: y, label: y };
});

export default function ReportsPage() {
  const [year, setYear] = useQueryState(
    'year',
    parseAsString.withDefault(String(CURRENT_YEAR)),
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
    <div className="mx-auto flex max-w-6xl flex-col gap-12">
      <PageHeader
        eyebrow="MalaSafe · Reports"
        title="Annual surveillance report"
        description="Caseload and alerting posture for the selected reporting year."
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
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              eyebrow="Total cases"
              value={data.total_positive.toLocaleString()}
              caption={`Reporting year ${data.year}`}
              icon={FileText}
              tone="signal"
            />
            <StatCard
              eyebrow="Active alerts"
              value={data.active_alerts.toLocaleString()}
              caption={data.active_alerts === 0 ? 'All clear' : 'Open right now'}
              icon={Activity}
              tone={data.active_alerts === 0 ? 'valid' : 'warn'}
            />
            <StatCard
              eyebrow="High-risk districts"
              value={data.high_risk_districts.toLocaleString()}
              caption="Elevated level"
              icon={ShieldAlert}
              tone={data.high_risk_districts === 0 ? 'valid' : 'error'}
            />
          </section>

          {/* Monthly trend */}
          <section className="flex flex-col gap-5">
            <SectionHeader index="001" label="Monthly trend" tone="signal">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {data.year} · monthly
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
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthly_trend.map((row) => (
                        <tr
                          key={row.period}
                          className="border-b border-border/70 last:border-0"
                        >
                          <Td className="font-mono text-xs tabular-nums">{row.period}</Td>
                          <Td align="right" className="tabular-nums">
                            {row.positive.toLocaleString()}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </EditorialCard>
            )}
          </section>

          {/* By region */}
          <section className="flex flex-col gap-5">
            <SectionHeader index="002" label="By region">
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
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_region.map((row) => (
                      <tr
                        key={row.region}
                        className="border-b border-border/70 last:border-0"
                      >
                        <Td className="font-sans text-foreground">{row.region}</Td>
                        <Td align="right" className="tabular-nums">
                          {row.districts_count.toLocaleString()}
                        </Td>
                        <Td align="right" className="tabular-nums">
                          {row.high_risk_count.toLocaleString()}
                        </Td>
                        <Td align="right" className="tabular-nums">
                          {row.total_positive.toLocaleString()}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
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
