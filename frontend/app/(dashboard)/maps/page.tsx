'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQueryState } from 'nuqs';
import { useRiskMap } from '@/lib/api/queries';
import { parseAsString } from '@/lib/url-state';
import { Activity, Layers, ShieldAlert, TrendingUp } from 'lucide-react';
import {
  AlertBanner,
  EditorialCard,
  EditorialSelect,
  EmptyState,
  LoadingScreen,
  PageHeader,
  SectionHeader,
  StatCard,
  StatusPill,
  riskLabel,
  riskStatus,
} from '@/components/editorial';

const RiskMap = dynamic(() => import('@/components/maps/risk-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] items-center justify-center border border-border bg-card">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Loading surface…
      </p>
    </div>
  ),
});

const REGIONS = [
  'Addis Ababa',
  'Afar',
  'Amhara',
  'Benishangul-Gumuz',
  'Dire Dawa',
  'Gambela',
  'Harari',
  'Oromia',
  'Sidama',
  'SNNPR',
  'Somali',
  'Tigray',
];

const LEGEND: Array<{ key: string; label: string; risk: 1 | 2 | 3 | 4 | 5 }> = [
  { key: 'low', label: 'Low', risk: 1 },
  { key: 'moderate', label: 'Moderate', risk: 2 },
  { key: 'medium', label: 'Medium', risk: 3 },
  { key: 'high', label: 'High', risk: 4 },
  { key: 'very_high', label: 'Very high', risk: 5 },
];

export default function MapsPage() {
  const [selectedRegion, setSelectedRegion] = useQueryState(
    'region',
    parseAsString.withDefault('Addis Ababa'),
  );

  const { data: mapData, isLoading, error } = useRiskMap(
    undefined,
    selectedRegion || undefined
  );

  const summary = useMemo(() => {
    if (!mapData?.features?.length) return null;
    const totals = mapData.features.reduce(
      (acc, f) => {
        acc.positive += f.properties.recent_positive ?? 0;
        const status = riskStatus(f.properties.risk_level);
        if (status === 'error') acc.veryHigh += 1;
        if (status === 'warn') acc.elevated += 1;
        return acc;
      },
      { positive: 0, veryHigh: 0, elevated: 0 },
    );
    return totals;
  }, [mapData]);

  const districtCount = mapData?.features.length ?? 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 animate-fade-in">
      <PageHeader
        eyebrow="MalaSafe · Risk surface"
        title="Risk maps"
        description="District-level malaria risk for the active reporting window. Filter by region to focus the surface."
        actions={
          <EditorialSelect
            value={selectedRegion}
            onChange={setSelectedRegion}
            aria-label="Region filter"
            options={[
              { value: '', label: 'All regions' },
              ...REGIONS.map((r) => ({ value: r, label: r })),
            ]}
          />
        }
      />

      <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <SectionHeader
          index="001"
          label="Surface"
          tone={summary && summary.veryHigh > 0 ? 'error' : summary && summary.elevated > 0 ? 'warn' : 'valid'}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
            {districtCount} districts
          </span>
        </SectionHeader>

        {isLoading ? (
          <LoadingScreen caption="Loading risk surface" />
        ) : error ? (
          <AlertBanner tone="error" title="Couldn't load the risk surface" description={(error as Error).message} />
        ) : !mapData || mapData.features.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No map data for this region"
            description="Try switching to All regions or another region from the filter."
          />
        ) : (
          <>
            <div className="relative overflow-hidden rounded-2xl border border-border/40 shadow-2xl group animate-in fade-in zoom-in-95 duration-700">
              <div className="h-[600px] w-full">
                <RiskMap data={mapData} />
              </div>

              <div className="absolute bottom-6 left-6 z-400 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/70 px-5 py-4 backdrop-blur-xl shadow-lg transition-transform duration-500 group-hover:-translate-y-2">
                <div className="flex flex-wrap items-center gap-5">
                  {LEGEND.map((item) => (
                    <span
                      key={item.key}
                      className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-foreground"
                    >
                      <span
                        aria-hidden
                        className={`inline-block size-3 rounded-full bg-risk-${item.risk} shadow-[0_0_8px_currentColor] text-risk-${item.risk}`}
                      />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="absolute top-6 right-6 z-400 flex items-center justify-center rounded-lg border border-border/40 bg-background/70 px-4 py-2.5 backdrop-blur-xl shadow-lg">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-foreground tabular-nums">
                  {districtCount} districts loaded
                </span>
              </div>
            </div>

            {summary ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  eyebrow="Districts on surface"
                  value={districtCount.toLocaleString()}
                  caption={selectedRegion ? selectedRegion : 'All regions'}
                  icon={Layers}
                  tone="signal"
                  help={`Number of districts with a current prediction visible on the map${selectedRegion ? ` (filtered to ${selectedRegion})` : ' (all regions).'}`}
                />
                <StatCard
                  eyebrow="Reported cases"
                  value={summary.positive.toLocaleString()}
                  caption="Latest reporting month, summed"
                  icon={Activity}
                  tone="signal"
                  help="Sum of cases reported (uploaded CSV) for the current reporting month across the districts visible above. Observed, not predicted."
                />
                <StatCard
                  eyebrow="Elevated (MED / HIGH)"
                  value={summary.elevated.toLocaleString()}
                  caption="Forecast bucket"
                  icon={TrendingUp}
                  tone={summary.elevated > 0 ? 'warn' : 'valid'}
                  help="Districts whose latest model prediction lands in the MEDIUM or HIGH bucket. Buckets are per-district percentile thresholds (p50/p75/p95) on the LightGBM model's predicted case-count distribution — forecast for next month, not observed."
                />
                <StatCard
                  eyebrow="Critical (VERY HIGH)"
                  value={summary.veryHigh.toLocaleString()}
                  caption="Forecast above p95"
                  icon={ShieldAlert}
                  tone={summary.veryHigh > 0 ? 'error' : 'valid'}
                  help="Districts whose latest model prediction exceeds the p95 historical threshold (forecast above the 95th percentile of their own case-count history)."
                />
              </div>
            ) : null}

            <SectionHeader index="002" label="Districts" tone="signal">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                {districtCount} rows
              </span>
            </SectionHeader>
            <EditorialCard className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <Th>District</Th>
                    <Th>Region</Th>
                    <Th>Risk (forecast)</Th>
                    <Th>Forecast for</Th>
                    <Th align="right">Cases (same month)</Th>
                  </tr>
                </thead>
                <tbody>
                  {mapData.features.map((feature, index) => {
                    const p = feature.properties;
                    const lowConfidence =
                      typeof p.confidence_score === 'number' && p.confidence_score < 0.4;
                    const status = riskStatus(p.risk_level);
                    return (
                      <tr
                        key={index}
                        className="group border-b border-border/40 transition-all duration-300 last:border-0 hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] cursor-pointer"
                      >
                        <Td>{p.district_name}</Td>
                        <Td muted>{p.region}</Td>
                        <Td>
                          <div className="flex flex-wrap items-center gap-2 relative">
                            {status === 'error' && (
                              <span className="absolute -left-3 top-2 h-1.5 w-1.5 animate-ping rounded-full bg-status-error" />
                            )}
                            <StatusPill kind={status}>
                              {riskLabel(p.risk_level)}
                            </StatusPill>
                            {lowConfidence ? (
                              <StatusPill kind="neutral">Low confidence</StatusPill>
                            ) : null}
                          </div>
                        </Td>
                        <Td muted>{p.prediction_period_label ?? '—'}</Td>
                        <Td align="right" numeric>
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {(p.recent_positive ?? 0).toLocaleString()}
                          </span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </EditorialCard>
          </>
        )}
      </section>
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
      className={`px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'
        }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  numeric = false,
  muted = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  numeric?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 font-sans text-sm ${muted ? 'text-muted-foreground' : 'text-foreground'} ${align === 'right' ? 'text-right' : 'text-left'
        } ${numeric ? 'font-mono tabular-nums' : ''}`}
    >
      {children}
    </td>
  );
}
