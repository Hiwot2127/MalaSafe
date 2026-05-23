'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQueryState } from 'nuqs';
import { mapsApi } from '@/lib/api/maps';
import { RiskMapResponse } from '@/types/map';
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
  const [mapData, setMapData] = useState<RiskMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useQueryState(
    'region',
    parseAsString.withDefault('Addis Ababa'),
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    mapsApi
      .getRiskMap(
        selectedRegion ? { region: selectedRegion } : {},
        { signal: controller.signal },
      )
      .then((response) => setMapData(response))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const maybe = err as { response?: { data?: { detail?: string } } };
        setError(maybe?.response?.data?.detail || 'Failed to fetch map data');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selectedRegion]);

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

      {/* Section 001 - Surface */}
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

        {loading ? (
          <LoadingScreen caption="Loading risk surface" />
        ) : error ? (
          <AlertBanner tone="error" title="Couldn't load the risk surface" description={error} />
        ) : !mapData || mapData.features.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No map data for this region"
            description="Try switching to All regions or another region from the filter."
          />
        ) : (
          <>
            {/* Map + legend */}
            <EditorialCard className="overflow-hidden">
              <div className="h-[520px]">
                <RiskMap data={mapData} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  {LEGEND.map((item) => (
                    <span
                      key={item.key}
                      className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className={`inline-block size-2.5 bg-risk-${item.risk}`}
                      />
                      {item.label}
                    </span>
                  ))}
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
                  {districtCount} districts loaded
                </span>
              </div>
            </EditorialCard>

            {/* Summary strip - StatCards with tinted icon circles. */}
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

            {/* Section 002 - Districts table */}
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
                    return (
                      <tr
                        key={index}
                        className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40"
                      >
                        <Td>{p.district_name}</Td>
                        <Td muted>{p.region}</Td>
                        <Td>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusPill kind={riskStatus(p.risk_level)}>
                              {riskLabel(p.risk_level)}
                            </StatusPill>
                            {lowConfidence ? (
                              <StatusPill kind="neutral">Low confidence</StatusPill>
                            ) : null}
                          </div>
                        </Td>
                        <Td muted>{p.prediction_period_label ?? '—'}</Td>
                        <Td align="right" numeric>
                          {(p.recent_positive ?? 0).toLocaleString()}
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
