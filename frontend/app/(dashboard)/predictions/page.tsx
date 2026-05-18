'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, MapPin, TrendingUp, ShieldAlert, Sparkles } from 'lucide-react';
import { predictionsApi } from '@/lib/api/predictions';
import type {
  DistrictRiskFeature,
  PredictionHistoryItem,
} from '@/types/predictions';
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

type Bucket = 'low' | 'moderate' | 'high' | 'very_high' | 'other';

function bucketFor(level: string): Bucket {
  if (level === 'low') return 'low';
  if (level === 'medium' || level === 'moderate') return 'moderate';
  if (level === 'high') return 'high';
  if (level === 'very_high') return 'very_high';
  return 'other';
}

export default function PredictionsPage() {
  const [features, setFeatures] = useState<DistrictRiskFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string>(''); // district_code
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await predictionsApi.getRiskCollection();
        if (!cancelled) setFeatures(data.features);
      } catch (err: unknown) {
        const maybe = err as { response?: { data?: { detail?: string } } };
        if (!cancelled) setError(maybe?.response?.data?.detail || 'Failed to load predictions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    (async () => {
      try {
        const data = await predictionsApi.getHistory(selected, { limit: 30 });
        if (!cancelled) setHistory(data.predictions);
      } catch (err: unknown) {
        const maybe = err as { response?: { data?: { detail?: string } } };
        if (!cancelled)
          setHistoryError(maybe?.response?.data?.detail || 'Failed to load history');
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const stats = useMemo(() => {
    const buckets: Record<Bucket, number> = { low: 0, moderate: 0, high: 0, very_high: 0, other: 0 };
    for (const f of features) buckets[bucketFor(f.properties.risk_level)]++;
    return {
      total: features.length,
      low: buckets.low,
      moderate: buckets.moderate,
      high: buckets.high + buckets.very_high,
    };
  }, [features]);

  const sortedDistricts = useMemo(() => {
    const order: Record<string, number> = { very_high: 0, high: 1, medium: 2, moderate: 2, low: 4 };
    return [...features].sort((a, b) => {
      const oa = order[a.properties.risk_level] ?? 5;
      const ob = order[b.properties.risk_level] ?? 5;
      if (oa !== ob) return oa - ob;
      return b.properties.prediction_score - a.properties.prediction_score;
    });
  }, [features]);

  const districtOptions = useMemo(
    () =>
      [{ value: '', label: 'Select a district' }, ...sortedDistricts.map((f) => ({
        value: f.properties.district_code,
        label: `${f.properties.district_name} · ${f.properties.region}`,
      }))],
    [sortedDistricts],
  );

  const selectedFeature = useMemo(
    () => features.find((f) => f.properties.district_code === selected) ?? null,
    [features, selected],
  );

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <PageHeader
          eyebrow="MalaSafe · Predictions"
          title="Risk predictions"
          description="District-level outbreak likelihood from the LightGBM model."
        />
        <LoadingScreen caption="Loading district predictions" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12">
      <PageHeader
        eyebrow="MalaSafe · Predictions"
        title="Risk predictions"
        description="District-level outbreak likelihood, ranked by the LightGBM model's latest run."
      />

      {error ? (
        <AlertBanner tone="error" title="Couldn't load predictions" description={error} />
      ) : null}

      {/* Stat overview */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          eyebrow="Districts tracked"
          value={stats.total.toLocaleString()}
          caption="Across all regions"
          icon={MapPin}
          tone="signal"
        />
        <StatCard
          eyebrow="Low risk"
          value={stats.low.toLocaleString()}
          caption={`${pct(stats.low, stats.total)} of all districts`}
          icon={Sparkles}
          tone="valid"
        />
        <StatCard
          eyebrow="Moderate risk"
          value={stats.moderate.toLocaleString()}
          caption={`${pct(stats.moderate, stats.total)} on watch`}
          icon={TrendingUp}
          tone="warn"
        />
        <StatCard
          eyebrow="High risk"
          value={stats.high.toLocaleString()}
          caption={`${pct(stats.high, stats.total)} flagged`}
          icon={ShieldAlert}
          tone="error"
        />
      </section>

      {/* Selector + detail */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="001" label="District detail" tone="signal">
          <EditorialSelect
            value={selected}
            onChange={setSelected}
            options={districtOptions}
            aria-label="Select a district"
            contentWidth="auto"
          />
        </SectionHeader>

        {!selected ? (
          <EmptyState
            icon={Activity}
            eyebrow="Awaiting selection"
            title="Pick a district to see its history"
            description="Choose a district above to view its last 30 daily predictions and the trajectory of its score."
          />
        ) : historyLoading ? (
          <LoadingScreen caption="Loading history" />
        ) : historyError ? (
          <AlertBanner tone="warn" title="History unavailable" description={historyError} />
        ) : history.length === 0 ? (
          <EmptyState
            icon={Activity}
            eyebrow={selectedFeature?.properties.district_name ?? selected}
            title="No history yet"
            description="The model hasn't produced predictions for this district in the requested window."
          />
        ) : (
          <EditorialCard className="overflow-hidden p-0">
            <div className="flex flex-col gap-1 border-b border-border px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {selectedFeature?.properties.region}
              </p>
              <div className="flex items-baseline gap-3">
                <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight">
                  {selectedFeature?.properties.district_name}
                </h3>
                {selectedFeature ? (
                  <StatusPill kind={riskStatus(selectedFeature.properties.risk_level)}>
                    {riskLabel(selectedFeature.properties.risk_level)}
                  </StatusPill>
                ) : null}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary/40 text-muted-foreground">
                  <tr>
                    <Th>Date</Th>
                    <Th align="right">Cases</Th>
                    <Th align="right">Deaths</Th>
                    <Th align="right">Score</Th>
                    <Th>Risk</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr
                      key={(h.prediction_id ?? `${h.date}-${i}`) as string}
                      className="border-b border-border/70 last:border-0"
                    >
                      <Td className="font-mono text-xs tabular-nums">
                        {formatDate(h.date)}
                      </Td>
                      <Td align="right" className="tabular-nums">
                        {h.predicted_cases?.toLocaleString() ?? '—'}
                      </Td>
                      <Td align="right" className="tabular-nums">
                        {h.predicted_deaths?.toLocaleString() ?? '—'}
                      </Td>
                      <Td align="right" className="tabular-nums">
                        {h.prediction_score?.toFixed(1) ?? '—'}
                      </Td>
                      <Td>
                        {h.risk_level ? (
                          <StatusPill kind={riskStatus(h.risk_level)}>
                            {riskLabel(h.risk_level)}
                          </StatusPill>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">—</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </EditorialCard>
        )}
      </section>

      {/* Latest predictions table */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="002" label="Latest by district">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            sorted by risk
          </span>
        </SectionHeader>

        <EditorialCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-secondary/40 text-muted-foreground">
                <tr>
                  <Th>District</Th>
                  <Th>Region</Th>
                  <Th>Risk</Th>
                  <Th align="right">Score</Th>
                  <Th align="right">Confidence</Th>
                  <Th align="right">Recent cases</Th>
                </tr>
              </thead>
              <tbody>
                {sortedDistricts.slice(0, 50).map((f) => {
                  const p = f.properties;
                  return (
                    <tr
                      key={p.district_code}
                      onClick={() => setSelected(p.district_code)}
                      className="cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-secondary/40"
                    >
                      <Td className="font-sans text-foreground">{p.district_name}</Td>
                      <Td className="text-muted-foreground">{p.region}</Td>
                      <Td>
                        <StatusPill kind={riskStatus(p.risk_level)}>
                          {riskLabel(p.risk_level)}
                        </StatusPill>
                      </Td>
                      <Td align="right" className="tabular-nums">
                        {p.prediction_score.toFixed(1)}
                      </Td>
                      <Td align="right" className="tabular-nums text-muted-foreground">
                        {(p.confidence_score * 100).toFixed(0)}%
                      </Td>
                      <Td align="right" className="tabular-nums">
                        {p.recent_cases.toLocaleString()}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </EditorialCard>
      </section>
    </div>
  );
}

function pct(part: number, whole: number): string {
  if (!whole) return '—';
  return `${((part / whole) * 100).toFixed(0)}%`;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return value;
  }
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
