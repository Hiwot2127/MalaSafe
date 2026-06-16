"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock, FileText, ArrowRight, Filter, X } from "lucide-react";
import { monthlyCloseApi, type MonthlyCloseDetail, type BacktestRow, type DriftRow } from "@/lib/api/monthly-close";
import { format } from "date-fns";
import { PageHeader, SectionHeader, EditorialSelect, Metric, EditorialCard, StatusPill, EmptyState, LoadingScreen } from "@/components/editorial";

export default function MonthlyClosePage() {
  const [selectedCloseId, setSelectedCloseId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");

  // Fetch list of monthly closes
  const { data: closes, isLoading: closesLoading, refetch } = useQuery({
    queryKey: ["monthly-closes"],
    queryFn: () => monthlyCloseApi.listMonthlyCloses({ limit: 50 }),
    refetchInterval: (query) => {
      // Auto-refresh every 5s if any close is not in terminal state
      const hasActive = query.state.data?.some((c: MonthlyCloseDetail) => !["completed", "failed"].includes(c.status));
      return hasActive ? 5000 : false;
    },
  });

  // Fetch backtest results for selected close
  const { data: backtests } = useQuery({
    queryKey: ["backtest-results", selectedCloseId],
    queryFn: () => monthlyCloseApi.getBacktestResults(selectedCloseId!, { limit: 10 }),
    enabled: !!selectedCloseId,
  });

  // Fetch drift findings for selected close
  const { data: drifts } = useQuery({
    queryKey: ["drift-findings", selectedCloseId],
    queryFn: () => monthlyCloseApi.getDriftFindings(selectedCloseId!, { limit: 10 }),
    enabled: !!selectedCloseId,
  });

  // Auto-select first close
  useEffect(() => {
    if (closes && closes.length > 0 && !selectedCloseId) {
      setSelectedCloseId(closes[0].id);
    }
  }, [closes, selectedCloseId]);

  // Filter closes
  const filteredCloses = closes?.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (modeFilter !== "all" && c.mode !== modeFilter) return false;
    return true;
  }) || [];

  // Stats for summary
  const statusCounts = closes?.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const selectedClose = filteredCloses?.find((c) => c.id === selectedCloseId);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-14 animate-fade-in">
      {/* Header */}
      <PageHeader
        eyebrow="MalaSafe · Data Operations"
        title="Monthly Close"
        description="Track month-end data processing pipelines. Each close validates predictions, detects drift, and regenerates forecasts with the latest malaria case data."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <EditorialSelect
              value={statusFilter}
              onChange={setStatusFilter}
              aria-label="Status filter"
              options={[
                { value: "all", label: "All status" },
                { value: "completed", label: "Completed" },
                { value: "pending", label: "Pending" },
                { value: "failed", label: "Failed" },
              ]}
            />
            <EditorialSelect
              value={modeFilter}
              onChange={setModeFilter}
              aria-label="Mode filter"
              options={[
                { value: "all", label: "All modes" },
                { value: "close", label: "Full close" },
                { value: "backfill", label: "Backfill" },
              ]}
            />
            {(statusFilter !== "all" || modeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setModeFilter("all");
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-foreground/60 hover:bg-secondary/50"
                aria-label="Clear filters"
              >
                <X className="size-3" strokeWidth={2} />
                Clear
              </button>
            )}
          </div>
        }
      />

      {/* Summary metrics */}
      {closes && closes.length > 0 && (
        <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <SectionHeader index="001" label="Summary" tone="signal" />
          <EditorialCard>
            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
              <Metric
                eyebrow="Total Closes"
                value={closes.length.toLocaleString()}
                caption="All time"
              />
              <Metric
                eyebrow="Completed"
                value={(statusCounts.completed || 0).toLocaleString()}
                status="valid"
                statusLabel="success"
              />
              <Metric
                eyebrow="In Progress"
                value={Object.entries(statusCounts)
                  .filter(([k]) => !["completed", "failed"].includes(k))
                  .reduce((sum, [, v]) => sum + v, 0)
                  .toLocaleString()}
                status={Object.keys(statusCounts).some(k => !["completed", "failed"].includes(k)) ? "warn" : "neutral"}
              />
              <Metric
                eyebrow="Failed"
                value={(statusCounts.failed || 0).toLocaleString()}
                status={(statusCounts.failed || 0) > 0 ? "error" : "neutral"}
                caption="Needs review"
              />
            </div>
          </EditorialCard>
        </section>
      )}

      {closesLoading ? (
        <LoadingScreen caption="Loading monthly closes" />
      ) : !closes || closes.length === 0 ? (
        <EmptyState
          title="No Monthly Closes Yet"
          description="Monthly closes are created automatically when you upload malaria data. Each close triggers backtesting, drift detection, and prediction regeneration."
          eyebrow="Ready to begin"
        />
      ) : (
        <section className="flex flex-col gap-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <SectionHeader index="002" label="Close Operations" tone="signal">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
              {filteredCloses.length} of {closes.length} shown
            </span>
          </SectionHeader>
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Sidebar - List of Closes */}
          <div className="flex flex-col gap-2">
            <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Recent Closes ({filteredCloses.length})
            </p>
            {filteredCloses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <Filter className="mx-auto mb-2 h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">No closes match your filters</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredCloses.map((close) => (
                  <button
                    key={close.id}
                    onClick={() => setSelectedCloseId(close.id)}
                    className={`group flex flex-col gap-2 rounded-lg border px-4 py-3 text-left transition-all ${
                      selectedCloseId === close.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">
                        {format(new Date(close.month), "MMMM yyyy")}
                      </span>
                      <StatusBadge status={close.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {close.mode === "close" ? "Full Close" : "Backfill"}
                      </span>
                      <Link
                        href={`/dashboard/monthly-close/${close.id}`}
                        className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Details
                        <ArrowRight className="size-3" strokeWidth={2} />
                      </Link>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex flex-col gap-6">
            {selectedClose && (
              <>
                {/* Close Details */}
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-semibold mb-1">
                        {format(new Date(selectedClose.month), "MMMM yyyy")} Close
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedClose.mode === "close" ? "Full monthly close process" : "Historical backfill operation"}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/monthly-close/${selectedClose.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-primary transition-all hover:bg-primary/10 hover:shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]"
                    >
                      View Full Details
                      <ArrowRight className="size-3.5" strokeWidth={2} />
                    </Link>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                      icon={Calendar}
                      label="Target Month"
                      value={format(new Date(selectedClose.month), "MMM yyyy")}
                    />
                    <MetricCard
                      icon={FileText}
                      label="Mode"
                      value={selectedClose.mode === "close" ? "Full Close" : "Backfill"}
                    />
                    <MetricCard
                      icon={Clock}
                      label="Status"
                      value={selectedClose.status}
                    />
                    <MetricCard
                      icon={CheckCircle}
                      label="Created"
                      value={format(new Date(selectedClose.created_at), "MMM d, yyyy")}
                    />
                  </div>
                </div>

                {/* Backtest Results */}
                {backtests && backtests.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <TrendingUp className="h-5 w-5" strokeWidth={1.5} />
                        Backtest Results Preview
                      </h3>
                      <Link
                        href={`/dashboard/monthly-close/${selectedClose.id}#backtest`}
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View all results
                        <ArrowRight className="size-3" strokeWidth={2} />
                      </Link>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Showing top 5 districts • {backtests.length} total
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border text-left text-sm text-muted-foreground">
                            <th className="pb-3 font-medium">District</th>
                            <th className="pb-3 font-medium">Predicted</th>
                            <th className="pb-3 font-medium">Actual</th>
                            <th className="pb-3 font-medium">Error</th>
                            <th className="pb-3 font-medium">Within Range</th>
                          </tr>
                        </thead>
                        <tbody>
                          {backtests.slice(0, 5).map((result) => (
                            <tr key={result.id} className="border-b border-border/50 last:border-0">
                              <td className="py-3 text-sm">{result.district_name || result.district_id.substring(0, 8) + "..."}</td>
                              <td className="py-3 text-sm">{result.predicted_positive?.toFixed(0) || "-"}</td>
                              <td className="py-3 text-sm">{result.actual_positive || "-"}</td>
                              <td className="py-3 text-sm">
                                {result.abs_error ? `${result.abs_error.toFixed(0)} (${result.pct_error?.toFixed(1)}%)` : "-"}
                              </td>
                              <td className="py-3">
                                {result.within_q10_q90 ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" strokeWidth={2} />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-amber-600" strokeWidth={2} />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Drift Findings */}
                {drifts && drifts.length > 0 && (
                  <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
                        Drift Findings Preview
                      </h3>
                      <Link
                        href={`/dashboard/monthly-close/${selectedClose.id}#drift`}
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        View all findings
                        <ArrowRight className="size-3" strokeWidth={2} />
                      </Link>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Showing top 5 findings • {drifts.length} total
                    </p>
                    <div className="flex flex-col gap-3">
                      {drifts.slice(0, 5).map((drift) => (
                        <div
                          key={drift.id}
                          className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4"
                        >
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" strokeWidth={1.5} />
                          <div className="flex-1">
                            <p className="font-medium text-sm capitalize">{drift.metric}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Severity: {drift.severity} | Z-Score: {drift.z_score?.toFixed(3) || "N/A"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </section>
      )}
    </div>
  );
}

// Helper Components
function StatusBadge({ status }: { status: string }) {
  const colors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    running: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    completed: "bg-green-500/10 text-green-700 dark:text-green-400",
    failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
        colors[status as keyof typeof colors] || colors.pending
      }`}
    >
      {status}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
