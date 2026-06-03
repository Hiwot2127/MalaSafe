"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { StatCard } from "@/components/editorial";
import type { GeoNameMaps } from "@/lib/api/uploads";
import type {
  MonthlyEda,
  NumericSummary,
  Histogram,
} from "@/lib/csv-eda";

const AXIS = "var(--color-muted-foreground)";
const GRID = "var(--color-border)";
const C1 = "var(--color-chart-1)";
const C2 = "var(--color-chart-2)";
const C3 = "var(--color-chart-3)";

export function UploadEdaPanel({ eda, nameMap }: { eda: MonthlyEda; nameMap?: GeoNameMaps }) {
  const { quality, summaries, histograms, byMonth, geographic, outliers, readiness, insights } = eda;
  const scoreTone = quality.score >= 90 ? "valid" : quality.score >= 70 ? "warn" : "error";

  // Resolve an opaque identifier to its woreda name (falls back to the raw id).
  const resolveName = (id: string): string => {
    if (!nameMap) return id;
    if (geographic.identifierField === "district_code") {
      return nameMap.by_district_code[id?.toUpperCase?.() ?? id] ?? id;
    }
    return nameMap.by_org_unit[id] ?? id;
  };
  const geoData = geographic.top.map((g) => ({ ...g, name: resolveName(g.location) }));

  return (
    <div className="flex flex-col gap-9 py-1">
      {/* ── Insights banner ── */}
      {insights.length > 0 && (
        <ul className="flex flex-col gap-1.5 border border-border bg-secondary/40 px-4 py-3">
          {insights.map((t, i) => (
            <li key={i} className="flex gap-2 font-sans text-sm text-foreground">
              <span aria-hidden className="select-none text-muted-foreground">·</span>
              {t}
            </li>
          ))}
        </ul>
      )}

      {/* ── 1 · Data quality ── */}
      <Section index="01" title="Data quality">
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          <StatCard
            eyebrow="Quality score"
            value={`${quality.score}`}
            caption="of 100"
            icon={ShieldCheck}
            tone={scoreTone}
            iconStyle="circle"
            className="rounded-none border-0"
          />
          <StatCard
            eyebrow="Completeness"
            value={`${quality.completeness.toFixed(0)}%`}
            caption="required cells"
            icon={CheckCircle2}
            iconStyle="circle"
            className="rounded-none border-0"
          />
          <StatCard
            eyebrow="Duplicates"
            value={`${quality.duplicateRows}`}
            caption="in file"
            icon={AlertTriangle}
            tone={quality.duplicateRows > 0 ? "warn" : null}
            iconStyle="circle"
            className="rounded-none border-0"
          />
          <StatCard
            eyebrow="Integrity"
            value={`${quality.integrityViolations + quality.typeErrors}`}
            caption="errors"
            icon={XCircle}
            tone={quality.integrityViolations + quality.typeErrors > 0 ? "error" : null}
            iconStyle="circle"
            className="rounded-none border-0"
          />
        </div>

        {quality.issues.length > 0 ? (
          <ul className="flex flex-col border border-border">
            {quality.issues.map((issue, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-4 border-b border-border/60 px-4 py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className={`font-sans text-sm ${issue.level === "error" ? "status-error" : "status-warn"}`}>
                    {issue.label}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">{issue.detail}</p>
                </div>
                <span className="shrink-0 font-display text-lg tabular-nums">{issue.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border border-border px-4 py-3 font-sans text-sm text-muted-foreground">
            No data-quality issues detected in this file.
          </p>
        )}
      </Section>

      {/* ── 2 · Descriptive statistics & distributions ── */}
      <Section index="02" title="Statistics & distributions">
        <SummaryTable summaries={summaries} />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {histograms.map((h) => (
            <HistogramChart key={h.field} hist={h} />
          ))}
        </div>
      </Section>

      {/* ── by-month trend ── */}
      {byMonth.length >= 2 && (
        <Section index="02b" title="Cases & positivity by month">
          <ChartFrame height={220}>
            <LineChart data={byMonth} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} width={44} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={false} width={40} unit="%" />
              <Tooltip {...tooltipProps} />
              <Line yAxisId="left" type="monotone" dataKey="cases" name="Cases" stroke={C1} strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="positivity" name="Positivity %" stroke={C3} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartFrame>
        </Section>
      )}

      {/* ── 3 · Geographic ── */}
      <Section
        index="03"
        title="Geographic burden"
        note={`${geographic.distinctLocations} reporting ${geographic.identifierField === "district_code" ? "districts" : "org units"}`}
      >
        {geoData.length > 0 ? (
          <ChartFrame height={Math.max(160, geoData.length * 28)}>
            <BarChart
              layout="vertical"
              data={geoData}
              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10, fill: AXIS }}
                tickLine={false}
                axisLine={false}
                width={120}
              />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="cases" name="Cases" fill={C1} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ChartFrame>
        ) : (
          <p className="font-sans text-sm text-muted-foreground">No geographic data to aggregate.</p>
        )}
        <p className="font-mono text-[11px] text-muted-foreground">
          Region / zone rollups and missing-reporting-location checks need server data — coming in a later phase.
        </p>
      </Section>

      {/* ── 4 · Outliers ── */}
      <Section index="04" title="Outliers & anomalies" note={`${outliers.length} flagged`}>
        {outliers.length > 0 ? (
          <div className="max-h-[220px] overflow-auto border border-border">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2 text-right">Positive</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {outliers.map((o, i) => (
                  <tr key={i} className="border-b border-border/60 last:border-0 font-mono text-xs">
                    <td className="px-3 py-1.5">{resolveName(o.location)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{o.month}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums status-warn">{o.positive.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{o.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="border border-border px-4 py-3 font-sans text-sm text-muted-foreground">
            No statistical outliers in case counts (IQR method).
          </p>
        )}
        <p className="font-mono text-[11px] text-muted-foreground">
          Flags use the within-file IQR fence. Comparison against historical averages is a later phase.
        </p>
      </Section>

      {/* ── 5 · Prediction readiness ── */}
      <Section index="05" title="Prediction readiness">
        <div
          className={`flex items-center gap-3 border px-4 py-3 ${
            readiness.ready ? "border-status-valid/40 bg-status-valid-tint" : "border-status-warn/40 bg-status-warn-tint"
          }`}
        >
          {readiness.ready ? (
            <CheckCircle2 aria-hidden className="size-5 status-valid" strokeWidth={1.75} />
          ) : (
            <AlertTriangle aria-hidden className="size-5 status-warn" strokeWidth={1.75} />
          )}
          <p className="font-display text-base font-semibold">
            {readiness.ready ? "Ready for the prediction pipeline" : "Needs attention before prediction"}
          </p>
        </div>
        <ul className="flex flex-col border border-border">
          {readiness.checks.map((c, i) => (
            <li key={i} className="flex items-start gap-3 border-b border-border/60 px-4 py-2.5 last:border-0">
              {c.ok ? (
                <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 status-valid" strokeWidth={1.75} />
              ) : (
                <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 status-warn" strokeWidth={1.75} />
              )}
              <div className="min-w-0">
                <p className="font-sans text-sm">{c.label}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Section({
  index,
  title,
  note,
  children,
}: {
  index: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{index}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">{title}</span>
        </div>
        {note ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{note}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const LABELS: Record<string, string> = {
  positive: "Positive (cases)",
  tests: "Tests",
  travel: "Travel",
  positivity_rate: "Positivity %",
};

function SummaryTable({ summaries }: { summaries: NumericSummary[] }) {
  const rows = summaries.filter((s) => s.count > 0);
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <th className="px-3 py-2">Field</th>
            {["Min", "Q1", "Median", "Mean", "Q3", "Max", "Std"].map((h) => (
              <th key={h} className="px-3 py-2 text-right">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.field} className="border-b border-border/60 last:border-0 font-mono text-xs tabular-nums">
              <td className="px-3 py-1.5 font-sans text-foreground">{LABELS[s.field] ?? s.field}</td>
              <td className="px-3 py-1.5 text-right">{num(s.min)}</td>
              <td className="px-3 py-1.5 text-right">{num(s.q1)}</td>
              <td className="px-3 py-1.5 text-right">{num(s.median)}</td>
              <td className="px-3 py-1.5 text-right text-foreground">{num(s.mean)}</td>
              <td className="px-3 py-1.5 text-right">{num(s.q3)}</td>
              <td className="px-3 py-1.5 text-right">{num(s.max)}</td>
              <td className="px-3 py-1.5 text-right text-muted-foreground">{num(s.std)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistogramChart({ hist }: { hist: Histogram }) {
  if (hist.bins.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {LABELS[hist.field] ?? hist.field}
      </p>
      <ChartFrame height={150}>
        <BarChart data={hist.bins} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: AXIS }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
          <Tooltip {...tooltipProps} />
          <Bar dataKey="count" name="Rows" radius={[2, 2, 0, 0]}>
            {hist.bins.map((_, i) => (
              <Cell key={i} fill={i % 2 === 0 ? C1 : C2} />
            ))}
          </Bar>
        </BarChart>
      </ChartFrame>
    </div>
  );
}

function ChartFrame({ height, children }: { height: number; children: React.ReactElement }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

const tooltipProps = {
  cursor: { fill: "var(--color-muted)", opacity: 0.4 },
  contentStyle: {
    background: "var(--color-popover, var(--color-card))",
    border: "1px solid var(--color-border)",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "var(--font-mono, monospace)",
  },
  labelStyle: { color: "var(--color-foreground)" },
} as const;

function num(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toFixed(1);
}
