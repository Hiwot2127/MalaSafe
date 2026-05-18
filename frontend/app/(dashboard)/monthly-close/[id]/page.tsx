"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import {
  monthlyCloseApi,
  type MonthlyCloseDetail,
  type BacktestRow,
  type DriftRow,
} from "@/lib/api/monthly-close";
import { cn } from "@/lib/utils";

// Stage order matches backend MonthlyClose state machine. Each entry maps to
// a status enum value the orchestrator writes as it walks the pipeline.
const STAGES: Array<{ key: MonthlyCloseDetail["status"]; label: string }> = [
  { key: "pending", label: "Queued" },
  { key: "climate_fetching", label: "Climate fetch" },
  { key: "backtesting", label: "Backtest" },
  { key: "drift_checking", label: "Drift check" },
  { key: "predicting", label: "Re-prediction" },
  { key: "completed", label: "Completed" },
];

const TERMINAL: ReadonlyArray<MonthlyCloseDetail["status"]> = ["completed", "failed"];

export default function MonthlyClosePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [close, setClose] = useState<MonthlyCloseDetail | null>(null);
  const [backtest, setBacktest] = useState<BacktestRow[]>([]);
  const [drift, setDrift] = useState<DriftRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const detail = await monthlyCloseApi.get(id);
      setClose(detail);
      if (TERMINAL.includes(detail.status)) {
        const [bt, dr] = await Promise.all([
          monthlyCloseApi.getBacktest(id).catch(() => ({ items: [], count: 0 })),
          monthlyCloseApi.getDrift(id).catch(() => ({ items: [], count: 0 })),
        ]);
        setBacktest(bt.items);
        setDrift(dr.items);
      }
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load close";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-poll until the pipeline reaches a terminal state.
  useEffect(() => {
    if (!close || TERMINAL.includes(close.status)) return;
    const t = setInterval(refresh, 4_000);
    return () => clearInterval(t);
  }, [close, refresh]);

  if (loading && !close) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-8 py-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Loading close pipeline…
        </p>
      </div>
    );
  }

  if (error || !close) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-8 py-8">
        <Link href="/upload" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> back to upload
        </Link>
        <div className="border border-status-error/40 bg-status-error-tint p-6">
          <p className="font-display font-semibold text-xl">Could not load this close</p>
          <p className="mt-2 font-sans text-sm text-muted-foreground">{error ?? "Unknown error"}</p>
        </div>
      </div>
    );
  }

  const monthLabel = formatMonthLabel(close.month);
  const climate = close.stats_json?.climate_fetch as Record<string, unknown> | string | undefined;
  const backtestStats = close.stats_json?.backtest as Record<string, unknown> | undefined;
  const driftStats = close.stats_json?.drift as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 py-8">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <Link
          href="/upload"
          className="inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.5} />
          Back to upload
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          MalaSafe · Close pipeline · {close.mode}
        </p>
        <h1 className="font-display font-semibold text-4xl leading-[1.05] tracking-tight">{monthLabel}</h1>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">{close.id}</p>
      </header>

      {/* Stage stepper */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="001" label="Pipeline status">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw aria-hidden className="size-3.5" strokeWidth={1.5} />
            Refresh
          </button>
        </SectionHeader>
        <StageList close={close} />
        {close.error && (
          <div className="border border-status-error/40 bg-status-error-tint p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-status-error">Pipeline error</p>
            <p className="mt-1 font-sans text-sm">{close.error}</p>
          </div>
        )}
      </section>

      {/* Climate fetch report — the Phase 4 surface */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="002" label="Climate fetch" />
        <ClimateReport climate={climate} />
      </section>

      {/* Backtest */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="003" label="Backtest" />
        {backtestStats ? (
          <BacktestSummary stats={backtestStats} />
        ) : (
          <EmptyNote text={close.status === "completed" ? "No backtest stats recorded." : "Not yet computed."} />
        )}
        {backtest.length > 0 && <BacktestRows rows={backtest.slice(0, 10)} totalCount={backtest.length} />}
      </section>

      {/* Drift */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="004" label="Drift findings" />
        {driftStats ? <DriftSummary stats={driftStats} /> : null}
        {drift.length > 0 ? (
          <DriftRows rows={drift.slice(0, 20)} totalCount={drift.length} />
        ) : (
          <EmptyNote text={close.status === "completed" ? "No drift findings." : "Not yet computed."} />
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ index, label, children }: { index: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
      <div className="flex items-baseline gap-3.5">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{index}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}

function StageList({ close }: { close: MonthlyCloseDetail }) {
  const failed = close.status === "failed";
  const completed = close.status === "completed";
  // When the pipeline is fully done, all stages should render as ✓ — no
  // lingering spinner on the final "Completed" row.
  const currentIdx = completed
    ? STAGES.length
    : STAGES.findIndex((s) => s.key === close.status);
  return (
    <ol className="flex flex-col">
      {STAGES.map((stage, i) => {
        const done = !failed && i < currentIdx;
        const active = !failed && i === currentIdx;
        const upcoming = !failed && i > currentIdx;
        const failedHere = failed && i === Math.max(currentIdx, 0);
        const Icon = done
          ? CheckCircle2
          : failedHere
          ? AlertTriangle
          : active
          ? Loader2
          : null;

        return (
          <li
            key={stage.key}
            className={cn(
              "flex items-center gap-4 border-b border-border/60 px-1 py-3 last:border-0",
              upcoming && "opacity-40",
            )}
          >
            <span className="w-8 font-mono text-[11px] tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <div className="flex size-6 items-center justify-center">
              {Icon && (
                <Icon
                  aria-hidden
                  className={cn(
                    "size-4",
                    done && "text-status-valid",
                    active && "animate-spin text-foreground",
                    failedHere && "text-status-error",
                  )}
                  strokeWidth={1.5}
                />
              )}
            </div>
            <p className="font-display font-semibold text-base">{stage.label}</p>
          </li>
        );
      })}
    </ol>
  );
}

function ClimateReport({ climate }: { climate: Record<string, unknown> | string | undefined }) {
  if (!climate) {
    return <EmptyNote text="Climate fetch hasn't started." />;
  }
  if (typeof climate === "string") {
    return <EmptyNote text={climate} />;
  }
  const errors = (climate.errors as string[] | undefined) ?? [];
  const target = (climate.target_month as string | undefined) ?? "—";
  return (
    <div className="flex flex-col gap-5 border border-border bg-card p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        Source · CHIRPS + ERA5-Land · target {target}
      </p>
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4">
        <Metric label="CHIRPS rows" value={asNumber(climate.chirps_rows)} />
        <Metric label="ERA5 rows" value={asNumber(climate.era5_rows)} />
        <Metric label="Imputed" value={asNumber(climate.imputed_rows)} />
        <Metric label="Upserted" value={asNumber(climate.upserted_rows)} />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {climate.provisional ? "Provisional · final rasters not yet published" : "Final · final CHIRPS/ERA5 rasters used"}
      </p>
      {errors.length > 0 && (
        <div className="border border-status-warn/40 bg-status-warn-tint p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-status-warn">Fetch issues</p>
          <ul className="mt-2 flex flex-col gap-1">
            {errors.map((e, i) => (
              <li key={i} className="font-sans text-sm">{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BacktestSummary({ stats }: { stats: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4">
      <Metric label="Districts" value={asNumber(stats.n_districts)} />
      <Metric label="MAE" value={asFloat(stats.mae)} />
      <Metric label="MAPE %" value={asFloat(stats.mape)} />
      <Metric label="Q10–Q90 cover %" value={asFloat(stats.interval_coverage_pct)} />
    </div>
  );
}

function BacktestRows({ rows, totalCount }: { rows: BacktestRow[]; totalCount: number }) {
  return (
    <div className="overflow-hidden border border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">District</th>
            <th className="px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Actual</th>
            <th className="px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Predicted</th>
            <th className="px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Abs error</th>
            <th className="px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">In Q10–Q90</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground tabular-nums">{r.district_id.slice(0, 8)}</td>
              <td className="px-4 py-2 text-right font-mono text-sm tabular-nums">{r.actual_cases}</td>
              <td className="px-4 py-2 text-right font-mono text-sm tabular-nums">{r.predicted_cases ?? "—"}</td>
              <td className="px-4 py-2 text-right font-mono text-sm tabular-nums">{r.abs_error ?? "—"}</td>
              <td className="px-4 py-2 text-right font-mono text-xs uppercase tracking-[0.18em]">{r.within_q10_q90 === null ? "—" : r.within_q10_q90 ? "yes" : "no"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalCount > rows.length && (
        <p className="border-t border-border bg-card px-4 py-2 font-mono text-[11px] text-muted-foreground">
          Showing top {rows.length} by absolute error (total {totalCount}).
        </p>
      )}
    </div>
  );
}

function DriftSummary({ stats }: { stats: Record<string, unknown> }) {
  // Backend stats only carry n_findings + n_critical; derive warn so we
  // don't show a "—" placeholder when total > critical.
  const findings = typeof stats.n_findings === "number" ? stats.n_findings : null;
  const critical = typeof stats.n_critical === "number" ? stats.n_critical : null;
  const warn =
    typeof stats.n_warn === "number"
      ? stats.n_warn
      : findings !== null && critical !== null
      ? findings - critical
      : null;
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden border border-border bg-border">
      <Metric label="Findings" value={asNumber(findings)} />
      <Metric label="Warn" value={asNumber(warn)} />
      <Metric label="Critical" value={asNumber(critical)} />
    </div>
  );
}

function DriftRows({ rows, totalCount }: { rows: DriftRow[]; totalCount: number }) {
  return (
    <div className="overflow-hidden border border-border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">District</th>
            <th className="px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Metric</th>
            <th className="px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">z-score</th>
            <th className="px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Severity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground tabular-nums">{r.district_id.slice(0, 8)}</td>
              <td className="px-4 py-2 font-mono text-xs uppercase tracking-[0.18em]">{r.metric}</td>
              <td className="px-4 py-2 text-right font-mono text-sm tabular-nums">{r.z_score.toFixed(2)}</td>
              <td className={cn(
                "px-4 py-2 text-right font-mono text-xs uppercase tracking-[0.18em]",
                r.severity === "critical" ? "text-status-error" : "text-status-warn",
              )}>{r.severity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalCount > rows.length && (
        <p className="border-t border-border bg-card px-4 py-2 font-mono text-[11px] text-muted-foreground">
          Showing top {rows.length} by z-score (total {totalCount}).
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 bg-card px-5 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="font-display font-semibold text-2xl leading-none tabular-nums">{value}</p>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="border border-border bg-card px-5 py-6 text-center">
      <p className="font-sans text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMonthLabel(monthIso: string): string {
  const [y, m] = monthIso.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function asNumber(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

function asFloat(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return Number.isFinite(v) ? v.toFixed(2) : "—";
  return String(v);
}
