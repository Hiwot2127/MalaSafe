"use client";

import { Activity, AlertTriangle, MapPin } from "lucide-react";

import { StatCard } from "@/components/editorial";
import type { DashboardSummary } from "@/types/analytics";

/**
 * Headline KPIs from `/analytics/dashboard`'s summary, plus a one-line model /
 * thresholds provenance footer so the numbers are auditable (which model
 * version produced them, and the global p50/p75/p95 risk cutoffs).
 */
export function KpiRow({ summary }: { summary: DashboardSummary }) {
  const m = summary.methodology ?? {};
  const t = summary.risk_thresholds;
  const windowDays = summary.prediction_window_days ?? 30;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-px bg-border/60 lg:grid-cols-3">
        <StatCard
          eyebrow="Total positive"
          value={summary.total_positive.toLocaleString()}
          caption={summary.period_label ?? summary.period}
          icon={Activity}
          tone="signal"
          help={m.total_positive}
          className="rounded-none border-0"
        />
        <StatCard
          eyebrow="Active alerts"
          value={summary.active_alerts.toLocaleString()}
          caption="currently active"
          icon={AlertTriangle}
          tone={summary.active_alerts > 0 ? "warn" : null}
          help={m.active_alerts}
          className="rounded-none border-0"
        />
        <StatCard
          eyebrow="High-risk districts"
          value={summary.high_risk_districts.toLocaleString()}
          caption={`last ${windowDays} days`}
          icon={MapPin}
          tone={summary.high_risk_districts > 0 ? "error" : null}
          help={m.high_risk_districts}
          className="col-span-2 rounded-none border-0 lg:col-span-1"
        />
      </div>

      {(summary.model_version || t) && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {summary.model_version && <span>model {summary.model_version}</span>}
          {summary.thresholds_version && <span>· thresholds {summary.thresholds_version}</span>}
          {t && (
            <span title={t.notes}>
              · p50 {fmt(t.p50)} / p75 {fmt(t.p75)} / p95 {fmt(t.p95)}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
}
