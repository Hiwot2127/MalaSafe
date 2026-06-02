"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import Link from "next/link";
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import {
  monthlyCloseApi,
  type MonthlyCloseDetail,
  type BacktestRow,
  type DriftRow,
  type PaginatedResponse,
} from "@/lib/api/monthly-close";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/Pagination";
import { EditorialSelect } from "@/components/editorial";
import {
  pageToSkip,
  parseAsPage,
  parseAsPageSize,
  parseAsStringLiteral,
} from "@/lib/url-state";

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
const SEVERITY_OPTIONS = ["", "warn", "critical"] as const;

const EMPTY_BT: PaginatedResponse<BacktestRow> = {
  monthly_close_id: "",
  count: 0,
  skip: 0,
  limit: 25,
  items: [],
};
const EMPTY_DR: PaginatedResponse<DriftRow> = {
  monthly_close_id: "",
  count: 0,
  skip: 0,
  limit: 25,
  items: [],
};

export default function MonthlyClosePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [tableState, setTableState] = useQueryStates(
    {
      bt_page: parseAsPage,
      bt_size: parseAsPageSize(25, 200),
      dr_page: parseAsPage,
      dr_size: parseAsPageSize(25, 200),
      severity: parseAsStringLiteral(SEVERITY_OPTIONS).withDefault(""),
    },
    { history: "replace" },
  );
  const { bt_page, bt_size, dr_page, dr_size, severity } = tableState;

  const [close, setClose] = useState<MonthlyCloseDetail | null>(null);
  const [backtest, setBacktest] = useState<PaginatedResponse<BacktestRow>>(EMPTY_BT);
  const [drift, setDrift] = useState<PaginatedResponse<DriftRow>>(EMPTY_DR);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Pipeline detail poll - runs once + on demand, plus the auto-poll effect
  // below kicks it every 4s while the pipeline isn't in a terminal state.
  const refreshClose = useCallback(async () => {
    if (!id) return;
    try {
      const detail = await monthlyCloseApi.get(id);
      setClose(detail);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load close";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refreshClose();
  }, [refreshClose]);

  // Auto-poll the pipeline until it terminates.
  useEffect(() => {
    if (!close || TERMINAL.includes(close.status)) return;
    const t = setInterval(refreshClose, 4_000);
    return () => clearInterval(t);
  }, [close, refreshClose]);

  // Backtest fetch - only after the pipeline reaches a terminal state, then
  // re-runs on page or page-size change. AbortController cancels in-flight
  // requests when the user clicks Next/Prev quickly.
  const isTerminal = !!close && TERMINAL.includes(close.status);
  useEffect(() => {
    if (!id || !isTerminal) return;
    const controller = new AbortController();
    monthlyCloseApi
      .getBacktest(
        id,
        { skip: pageToSkip(bt_page, bt_size), limit: bt_size },
        { signal: controller.signal },
      )
      .then((data) => setBacktest(data))
      .catch(() => {
        if (!controller.signal.aborted) setBacktest(EMPTY_BT);
      });
    return () => controller.abort();
  }, [id, isTerminal, bt_page, bt_size]);

  // Drift fetch - same shape, plus severity filter. Severity changes reset
  // dr_page to 1 at the caller site.
  useEffect(() => {
    if (!id || !isTerminal) return;
    const controller = new AbortController();
    monthlyCloseApi
      .getDrift(
        id,
        {
          skip: pageToSkip(dr_page, dr_size),
          limit: dr_size,
          ...(severity ? { severity: severity as "warn" | "critical" } : {}),
        },
        { signal: controller.signal },
      )
      .then((data) => setDrift(data))
      .catch(() => {
        if (!controller.signal.aborted) setDrift(EMPTY_DR);
      });
    return () => controller.abort();
  }, [id, isTerminal, dr_page, dr_size, severity]);

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
        <Link href="/dashboard/upload" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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
          href="/dashboard/upload"
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
            onClick={refreshClose}
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

      {/* Climate fetch report - the Phase 4 surface */}
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
        {isTerminal && backtest.count > 0 ? (
          <div className="overflow-hidden border border-border bg-card">
            <BacktestRowsTable rows={backtest.items} />
            <Pagination
              page={bt_page}
              pageSize={bt_size}
              total={backtest.count}
              unit="districts"
              onChange={(next) => setTableState({ bt_page: next })}
            />
          </div>
        ) : null}
      </section>

      {/* Drift */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="004" label="Drift findings">
          <EditorialSelect
            value={severity}
            onChange={(next) =>
              setTableState({
                severity: next as (typeof SEVERITY_OPTIONS)[number],
                dr_page: 1,
              })
            }
            aria-label="Severity filter"
            options={[
              { value: "", label: "All severity" },
              { value: "warn", label: "Warn only" },
              { value: "critical", label: "Critical only" },
            ]}
          />
        </SectionHeader>
        {driftStats ? <DriftSummary stats={driftStats} /> : null}
        {isTerminal && drift.count > 0 ? (
          <div className="overflow-hidden border border-border bg-card">
            <DriftRowsTable rows={drift.items} />
            <Pagination
              page={dr_page}
              pageSize={dr_size}
              total={drift.count}
              unit="findings"
              onChange={(next) => setTableState({ dr_page: next })}
            />
          </div>
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
  // When the pipeline is fully done, all stages should render as ✓ - no
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
  const target = (climate.target_month as string | undefined) ?? "-";
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

function BacktestRowsTable({ rows }: { rows: BacktestRow[] }) {
  return (
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
            <td className="px-4 py-2 text-right font-mono text-sm tabular-nums">{r.predicted_cases ?? "-"}</td>
            <td className="px-4 py-2 text-right font-mono text-sm tabular-nums">{r.abs_error ?? "-"}</td>
            <td className="px-4 py-2 text-right font-mono text-xs uppercase tracking-[0.18em]">{r.within_q10_q90 === null ? "-" : r.within_q10_q90 ? "yes" : "no"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DriftSummary({ stats }: { stats: Record<string, unknown> }) {
  // Backend stats only carry n_findings + n_critical; derive warn so we
  // don't show a "-" placeholder when total > critical.
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

function DriftRowsTable({ rows }: { rows: DriftRow[] }) {
  return (
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
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

function asFloat(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") return Number.isFinite(v) ? v.toFixed(2) : "-";
  return String(v);
}
