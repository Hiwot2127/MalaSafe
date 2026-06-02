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
import type { RiskLevel } from '@/types/map';

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

const LEGEND_COLORS: Record<number, string> = {
  1: 'hsl(145 22% 52%)',
  2: 'hsl(75 30% 50%)',
  3: 'hsl(38 56% 50%)',
  4: 'hsl(20 56% 50%)',
  5: 'hsl(12 50% 46%)',
};

export default function MapsPage() {
  const [selectedRegion, setSelectedRegion] = useQueryState(
    'region',
    parseAsString.withDefault('Addis Ababa'),
  );
  const [selectedRisk, setSelectedRisk] = useQueryState(
    'risk',
    parseAsString.withDefault(''),
  );

  const { data: mapData, isLoading, error } = useRiskMap(
    undefined,
    selectedRegion || undefined
  );

  const visibleMapData = useMemo(() => {
    if (!mapData || !selectedRisk) return mapData;

    return {
      ...mapData,
      features: mapData.features.filter(
        (feature) => feature.properties.risk_level === selectedRisk,
      ),
    };
  }, [mapData, selectedRisk]);

  const summary = useMemo(() => {
    if (!visibleMapData?.features?.length) return null;
    const totals = visibleMapData.features.reduce(
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
  }, [visibleMapData]);

  const districtCount = visibleMapData?.features.length ?? 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 animate-fade-in">
      <PageHeader
        eyebrow="MalaSafe · Risk surface"
        title="Risk maps"
        description="District-level malaria risk for the active reporting window. Filter by region or click a color to focus the surface."
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
        ) : !visibleMapData || visibleMapData.features.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={selectedRisk ? 'No districts match this risk level' : 'No map data for this region'}
            description={
              selectedRisk
                ? 'Clear the risk filter or choose another color chip to show districts again.'
                : 'Try switching to All regions or another region from the filter.'
            }
            action={
              selectedRisk ? (
                <button
                  type="button"
                  onClick={() => setSelectedRisk(null)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground/60 hover:bg-secondary/50"
                >
                  Clear risk filter
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="relative overflow-hidden rounded-2xl border border-border/40 shadow-2xl group animate-in fade-in zoom-in-95 duration-700">
              <div className="h-[600px] w-full">
                <RiskMap data={visibleMapData} />
              </div>
              
              <div className="absolute bottom-6 left-6 z-[400] flex flex-col gap-3 rounded-xl border border-border/40 bg-background/75 px-5 py-4 backdrop-blur-xl shadow-lg transition-transform duration-500 group-hover:-translate-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRisk(null)}
                    aria-pressed={!selectedRisk}
                    aria-label="Show all risk levels on map"
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                      !selectedRisk
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border/60 bg-background text-foreground hover:border-foreground/60 hover:bg-secondary/50'
                    }`}
                  >
                    All
                  </button>
                  {LEGEND.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedRisk(item.key as RiskLevel)}
                      aria-pressed={selectedRisk === item.key}
                      aria-label={`Filter map to show only ${item.label} risk districts`}
                      className={`inline-flex items-center gap-3 rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                        selectedRisk === item.key
                          ? 'border-foreground bg-secondary text-foreground'
                          : 'border-border/60 bg-background text-foreground hover:border-foreground/60 hover:bg-secondary/50'
                      }`}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          background: LEGEND_COLORS[item.risk],
                          boxShadow: `0 4px 12px -6px ${LEGEND_COLORS[item.risk]}`,
                          display: 'inline-block',
                        }}
                      />
                      <span>{item.label} risk</span>
                    </button>
                  ))}
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Click a risk level to filter districts. Not color-only: each level is labeled with text.
                </p>
              </div>

              <div className="absolute top-6 right-6 z-[400] flex items-center justify-center rounded-lg border border-border/40 bg-background/70 px-4 py-2.5 backdrop-blur-xl shadow-lg">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.20em] text-foreground tabular-nums">
                  {districtCount} districts loaded
                </span>
              </div>
            </div>

            {summary ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  eyebrow="Districts on surface"
                  value={districtCount.toLocaleString()}
                  caption={`${selectedRegion ? selectedRegion : 'All regions'}${selectedRisk ? ` · ${selectedRisk.replace('_', ' ')}` : ''}`}
                  icon={Layers}
                  tone="signal"
                  help={`Number of districts with a current prediction visible on the map${selectedRegion ? ` (filtered to ${selectedRegion})` : ' (all regions)'}${selectedRisk ? ` and ${selectedRisk.replace('_', ' ')} risk` : ''}.`}
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
                  {visibleMapData.features.map((feature, index) => {
                    const p = feature.properties;
                    const lowConfidence =
                      typeof p.confidence_score === 'number' && p.confidence_score < 0.4;
                    const status = riskStatus(p.risk_level);
                    return (
                      <tr
                        key={index}
                        className="group border-b border-border/40 transition-all duration-300 last:border-0 hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
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
      className={`px-4 py-3 font-sans text-sm ${muted ? 'text-muted-foreground' : 'text-foreground'
        } ${align === 'right' ? 'text-right' : 'text-left'} ${numeric ? 'font-mono tabular-nums' : ''
        }`}
    >
      {children}
    </td>
  );
}

