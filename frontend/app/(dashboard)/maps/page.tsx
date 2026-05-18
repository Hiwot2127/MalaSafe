'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { mapsApi } from '@/lib/api/maps';
import { RiskMapResponse } from '@/types/map';
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

const LEGEND: Array<{ label: string; status: 'valid' | 'warn' | 'error'; key: string }> = [
  { key: 'low', label: 'Low', status: 'valid' },
  { key: 'medium', label: 'Medium', status: 'warn' },
  { key: 'high', label: 'High', status: 'warn' },
  { key: 'very_high', label: 'Very high', status: 'error' },
];

export default function MapsPage() {
  const [mapData, setMapData] = useState<RiskMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  useEffect(() => {
    const fetchMapData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = selectedRegion ? { region: selectedRegion } : undefined;
        const response = await mapsApi.getRiskMap(params);
        setMapData(response);
      } catch (err: unknown) {
        const maybe = err as { response?: { data?: { detail?: string } } };
        setError(maybe?.response?.data?.detail || 'Failed to fetch map data');
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [selectedRegion]);

  const summary = useMemo(() => {
    if (!mapData?.features?.length) return null;
    const totals = mapData.features.reduce(
      (acc, f) => {
        acc.cases += f.properties.recent_cases ?? 0;
        acc.deaths += f.properties.recent_deaths ?? 0;
        const status = riskStatus(f.properties.risk_level);
        if (status === 'error') acc.veryHigh += 1;
        if (status === 'warn') acc.elevated += 1;
        return acc;
      },
      { cases: 0, deaths: 0, veryHigh: 0, elevated: 0 },
    );
    return totals;
  }, [mapData]);

  const districtCount = mapData?.features.length ?? 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14">
      <PageHeader
        eyebrow="MalaSafe · Risk surface"
        title="Risk maps"
        description="District-level malaria risk for the active reporting window. Filter by region to focus the surface."
        actions={
          <EditorialSelect
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            aria-label="Region filter"
          >
            <option value="">All regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </EditorialSelect>
        }
      />

      {/* Section 001 — Surface */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="001" label="Surface">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
            {districtCount} districts
          </span>
        </SectionHeader>

        {loading ? (
          <EditorialCard className="flex h-96 items-center justify-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Loading surface…
            </p>
          </EditorialCard>
        ) : error ? (
          <div className="border border-status-error/40 bg-status-error-tint px-4 py-3 font-sans text-sm text-status-error">
            {error}
          </div>
        ) : !mapData || mapData.features.length === 0 ? (
          <EditorialCard className="flex h-96 items-center justify-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              No map data available
            </p>
          </EditorialCard>
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
                        className={`inline-block size-2.5 ${
                          item.status === 'valid'
                            ? 'bg-status-valid'
                            : item.status === 'warn'
                              ? 'bg-status-warn'
                              : 'bg-status-error'
                        }`}
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

            {/* Summary strip */}
            {summary ? (
              <EditorialCard>
                <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
                  <Metric eyebrow="Districts" value={districtCount.toLocaleString()} />
                  <Metric
                    eyebrow="Recent cases"
                    value={summary.cases.toLocaleString()}
                    caption="Sum across surface"
                  />
                  <Metric
                    eyebrow="Elevated"
                    value={summary.elevated.toLocaleString()}
                    caption="Medium / high"
                    status={summary.elevated > 0 ? 'warn' : 'valid'}
                    statusLabel={summary.elevated > 0 ? 'watch' : 'clear'}
                  />
                  <Metric
                    eyebrow="Very high"
                    value={summary.veryHigh.toLocaleString()}
                    caption="Critical districts"
                    status={summary.veryHigh > 0 ? 'error' : 'valid'}
                    statusLabel={summary.veryHigh > 0 ? 'critical' : 'clear'}
                  />
                </div>
              </EditorialCard>
            ) : null}

            {/* Section 002 — Districts table */}
            <SectionHeader index="002" label="Districts">
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
                    <Th>Risk</Th>
                    <Th align="right">Cases</Th>
                    <Th align="right">Deaths</Th>
                  </tr>
                </thead>
                <tbody>
                  {mapData.features.map((feature, index) => (
                    <tr
                      key={index}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40"
                    >
                      <Td>{feature.properties.district_name}</Td>
                      <Td muted>{feature.properties.region}</Td>
                      <Td>
                        <StatusPill kind={riskStatus(feature.properties.risk_level)}>
                          {riskLabel(feature.properties.risk_level)}
                        </StatusPill>
                      </Td>
                      <Td align="right" numeric>
                        {(feature.properties.recent_cases ?? 0).toLocaleString()}
                      </Td>
                      <Td align="right" numeric>
                        {(feature.properties.recent_deaths ?? 0).toLocaleString()}
                      </Td>
                    </tr>
                  ))}
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
      className={`px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground ${
        align === 'right' ? 'text-right' : 'text-left'
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
      className={`px-4 py-3 font-sans text-sm ${
        muted ? 'text-muted-foreground' : 'text-foreground'
      } ${align === 'right' ? 'text-right' : 'text-left'} ${
        numeric ? 'font-mono tabular-nums' : ''
      }`}
    >
      {children}
    </td>
  );
}
