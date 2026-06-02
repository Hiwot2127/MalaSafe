'use client';

import { useEffect, useMemo, useState } from 'react';
import { debounce, useQueryState, useQueryStates } from 'nuqs';
import { Activity, MapPin, TrendingUp, ShieldAlert, Sparkles } from 'lucide-react';
import { predictionsApi } from '@/lib/api/predictions';
import { exportsApi } from '@/lib/api/exports';
import type {
  DistrictRiskFeature,
  LatestPredictionsResponse,
  PredictionHistoryItem,
  PredictionRow,
} from '@/types/predictions';
import {
  AlertBanner,
  EditorialCard,
  EditorialInput,
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
import RecommendationPanel from '@/components/recommendations/RecommendationPanel';
import { Download } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import {
  pageToSkip,
  parseAsPage,
  parseAsPageSize,
  parseAsString,
  parseAsStringLiteral,
} from '@/lib/url-state';

type Bucket = 'low' | 'moderate' | 'high' | 'very_high' | 'other';

function bucketFor(level: string): Bucket {
  if (level === 'low') return 'low';
  if (level === 'medium' || level === 'moderate') return 'moderate';
  if (level === 'high') return 'high';
  if (level === 'very_high') return 'very_high';
  return 'other';
}

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

const RISK_OPTIONS = ['', 'low', 'moderate', 'high', 'very_high'] as const;

const EMPTY_LATEST: LatestPredictionsResponse = {
  items: [],
  total: 0,
  skip: 0,
  limit: 25,
};

export default function PredictionsPage() {
  // ── Section 001: district picker source (full list, used for the
  // dropdown only). Sections 002 and the history below are paginated
  // independently and no longer rely on this snapshot.
  const [features, setFeatures] = useState<DistrictRiskFeature[]>([]);
  const [pickerLoading, setPickerLoading] = useState(true);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // ── Selected district + paginated history.
  const [selected, setSelected] = useQueryState(
    'district',
    parseAsString.withDefault(''),
  );
  const [historyPage, setHistoryPage] = useQueryState(
    'h_page',
    parseAsPage,
  );
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const HISTORY_PAGE_SIZE = 30;

  // ── Section 002: paginated "Latest by district" table state.
  const [latestParams, setLatestParams] = useQueryStates(
    {
      q: parseAsString.withDefault(''),
      region: parseAsString.withDefault(''),
      risk: parseAsStringLiteral(RISK_OPTIONS).withDefault(''),
      page: parseAsPage,
      pageSize: parseAsPageSize(25, 100),
    },
    { history: 'replace' },
  );
  const { q, region, risk, page, pageSize } = latestParams;
  // Local mirror for the search box so each keystroke renders instantly
  // while the URL + fetch debounce behind the scenes.
  const [qLocal, setQLocal] = useState(q);
  const [latest, setLatest] = useState<LatestPredictionsResponse>(EMPTY_LATEST);
  const [latestLoading, setLatestLoading] = useState(true);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [exportingDistrictPdf, setExportingDistrictPdf] = useState(false);

  // ── Effects ────────────────────────────────────────────────────────────

  // Load the picker list once (still calls /maps/risk because it needs
  // every district; a typeahead would be a better long-term fix but is
  // outside this pagination pass).
  useEffect(() => {
    const controller = new AbortController();
    predictionsApi
      .getRiskCollection({ signal: controller.signal })
      .then((data) => setFeatures(data.features))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const maybe = err as { response?: { data?: { detail?: string } } };
        setPickerError(maybe?.response?.data?.detail || 'Failed to load district list');
      })
      .finally(() => {
        if (!controller.signal.aborted) setPickerLoading(false);
      });
    return () => controller.abort();
  }, []);

  // Paginated history for the currently-selected district.
  useEffect(() => {
    if (!selected) {
      setHistory([]);
      setHistoryTotal(0);
      return;
    }
    // `selected` is a district_code. The backend route accepts either a UUID
    // or a district_code, so we pass it straight through — no dependence on
    // the /maps/risk snapshot being hydrated, and no silent failure if the
    // snapshot and live District table drift apart.
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError(null);
    predictionsApi
      .getHistory(
        selected,
        {
          skip: pageToSkip(historyPage, HISTORY_PAGE_SIZE),
          limit: HISTORY_PAGE_SIZE,
        },
        { signal: controller.signal },
      )
      .then((data) => {
        setHistory(data.predictions);
        setHistoryTotal(data.total ?? data.predictions.length);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const maybe = err as {
          response?: { status?: number; data?: { detail?: string } };
          message?: string;
        };
        const detail = maybe?.response?.data?.detail;
        const status = maybe?.response?.status;
        const fallback = status
          ? `Request failed (${status}) — district "${selected}"`
          : maybe?.message
            ? `${maybe.message} — district "${selected}"`
            : `Failed to load history for "${selected}"`;
        setHistoryError(detail || fallback);
        setHistory([]);
        setHistoryTotal(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, [selected, historyPage]);

  // Paginated server-side "Latest by district" table.
  useEffect(() => {
    const controller = new AbortController();
    setLatestLoading(true);
    setLatestError(null);
    predictionsApi
      .getLatest(
        {
          ...(q.trim() ? { q: q.trim() } : {}),
          ...(region ? { region } : {}),
          ...(risk ? { risk_level: risk } : {}),
          skip: pageToSkip(page, pageSize),
          limit: pageSize,
        },
        { signal: controller.signal },
      )
      .then((data) => setLatest(data))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const maybe = err as { response?: { data?: { detail?: string } } };
        setLatestError(maybe?.response?.data?.detail || 'Failed to load predictions');
        setLatest(EMPTY_LATEST);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLatestLoading(false);
      });
    return () => controller.abort();
  }, [q, region, risk, page, pageSize]);

  // ── Derived ────────────────────────────────────────────────────────────

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

  const districtOptions = useMemo(() => {
    const sorted = [...features].sort((a, b) => {
      const order: Record<string, number> = { very_high: 0, high: 1, medium: 2, moderate: 2, low: 4 };
      const oa = order[a.properties.risk_level] ?? 5;
      const ob = order[b.properties.risk_level] ?? 5;
      if (oa !== ob) return oa - ob;
      return b.properties.prediction_score - a.properties.prediction_score;
    });
    return [
      { value: '', label: 'Select a district' },
      ...sorted.map((f) => ({
        value: f.properties.district_code,
        label: `${f.properties.district_name} · ${f.properties.region}`,
      })),
    ];
  }, [features]);

  const selectedFeature = useMemo(
    () => features.find((f) => f.properties.district_code === selected) ?? null,
    [features, selected],
  );

  const latestPredictionId = history[0]?.prediction_id ?? history[0]?.id ?? null;
  const selectedDistrictId = selectedFeature?.properties.district_id ?? null;

  const handleDistrictExport = async () => {
    if (!selectedDistrictId) return;
    try {
      setExportingDistrictPdf(true);
      await exportsApi.downloadDistrictReport(selectedDistrictId);
    } catch (err) {
      const maybe = err as { response?: { data?: { detail?: string } }; message?: string };
      setHistoryError(maybe.response?.data?.detail || maybe.message || 'Failed to export district PDF');
    } finally {
      setExportingDistrictPdf(false);
    }
  };

  if (pickerLoading && features.length === 0) {
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

      {pickerError ? (
        <AlertBanner tone="error" title="Couldn't load district list" description={pickerError} />
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
            onChange={(next) => {
              setSelected(next || null);
              setHistoryPage(1);
            }}
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
            description="Choose a district above to view its prediction trajectory."
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
          <div className="flex flex-col gap-5">
            <EditorialCard className="overflow-hidden p-0">
              <div className="flex flex-col gap-1 border-b border-border px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
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

                  <button
                    type="button"
                    onClick={handleDistrictExport}
                    disabled={!selectedDistrictId || exportingDistrictPdf}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:border-foreground/60 hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="size-3.5" strokeWidth={1.75} aria-hidden />
                    {exportingDistrictPdf ? 'Exporting PDF…' : 'Export PDF'}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-secondary/40 text-muted-foreground">
                    <tr>
                      <Th>Date</Th>
                      <Th align="right">Cases</Th>
                      <Th align="right">Score</Th>
                      <Th>Risk</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr
                        key={(h.prediction_id ?? h.id ?? `${h.date}-${i}`) as string}
                        className="border-b border-border/70 last:border-0"
                      >
                        <Td className="font-mono text-xs tabular-nums">
                          {formatDate(h.date)}
                        </Td>
                        <Td align="right" className="tabular-nums">
                          {h.predicted_positive?.toLocaleString() ?? '—'}
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
              <Pagination
                page={historyPage}
                pageSize={HISTORY_PAGE_SIZE}
                total={historyTotal}
                unit="predictions"
                onChange={(next) => setHistoryPage(next)}
              />
            </EditorialCard>

            {latestPredictionId ? (
              <RecommendationPanel
                predictionId={latestPredictionId}
                onGenerate={() => setHistoryPage(1)}
              />
            ) : null}
          </div>
        )}
      </section>

      {/* Latest predictions table (server-paginated) */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="002" label="Latest by district">
          <div className="flex flex-wrap items-center gap-2">
            <EditorialInput
              type="search"
              value={qLocal}
              placeholder="Search district…"
              aria-label="Search district name"
              className="w-48"
              onChange={(e) => {
                const next = e.target.value;
                setQLocal(next);
                setLatestParams(
                  { q: next, page: 1 },
                  { limitUrlUpdates: debounce(300) },
                );
              }}
            />
            <EditorialSelect
              value={region}
              onChange={(next) => setLatestParams({ region: next, page: 1 })}
              aria-label="Region filter"
              options={[
                { value: '', label: 'All regions' },
                ...REGIONS.map((r) => ({ value: r, label: r })),
              ]}
            />
            <EditorialSelect
              value={risk}
              onChange={(next) =>
                setLatestParams({
                  risk: next as (typeof RISK_OPTIONS)[number],
                  page: 1,
                })
              }
              aria-label="Risk filter"
              options={[
                { value: '', label: 'All risk' },
                { value: 'low', label: 'Low' },
                { value: 'moderate', label: 'Moderate' },
                { value: 'high', label: 'High' },
                { value: 'very_high', label: 'Very high' },
              ]}
            />
          </div>
        </SectionHeader>

        {latestError ? (
          <AlertBanner tone="error" title="Couldn't load predictions" description={latestError} />
        ) : latestLoading && latest.items.length === 0 ? (
          <LoadingScreen caption="Loading predictions" />
        ) : latest.items.length === 0 ? (
          <EmptyState
            title="No predictions match"
            description="Try clearing the search or relaxing the filters."
          />
        ) : (
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
                  {latest.items.map((row: PredictionRow) => {
                    const lowConfidence = row.confidence_score < 0.4;
                    return (
                      <tr
                        key={row.district_code}
                        onClick={() => {
                          setSelected(row.district_code);
                          setHistoryPage(1);
                        }}
                        className="cursor-pointer border-b border-border/70 transition-colors last:border-0 hover:bg-secondary/40"
                      >
                        <Td className="font-sans text-foreground">{row.district_name}</Td>
                        <Td className="text-muted-foreground">{row.region}</Td>
                        <Td>
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusPill kind={riskStatus(row.risk_level)}>
                                {riskLabel(row.risk_level)}
                              </StatusPill>
                              {lowConfidence ? (
                                <StatusPill kind="neutral">Low confidence</StatusPill>
                              ) : null}
                            </div>
                            {row.prediction_period_label ? (
                              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                Forecast · {row.prediction_period_label}
                              </span>
                            ) : null}
                          </div>
                        </Td>
                        <Td align="right" className="tabular-nums">
                          {row.prediction_score.toFixed(1)}
                        </Td>
                        <Td align="right" className="tabular-nums text-muted-foreground">
                          {(row.confidence_score * 100).toFixed(0)}%
                        </Td>
                        <Td align="right" className="tabular-nums">
                          {row.recent_positive.toLocaleString()}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={latest.total}
              unit="districts"
              onChange={(next) => setLatestParams({ page: next })}
            />
          </EditorialCard>
        )}
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
