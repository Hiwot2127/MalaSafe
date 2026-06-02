"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";
import { monthlyCloseApi } from "@/lib/api/monthly-close";
import type { MonthlyClose, BacktestResult, DriftFinding } from "@/types/monthly-close";
import { format } from "date-fns";

export default function MonthlyClosePage() {
  const [selectedCloseId, setSelectedCloseId] = useState<string | null>(null);

  // Fetch list of monthly closes
  const { data: closes, isLoading: closesLoading } = useQuery({
    queryKey: ["monthly-closes"],
    queryFn: () => monthlyCloseApi.listMonthlyCloses({ limit: 20 }),
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

  const selectedClose = closes?.find((c) => c.id === selectedCloseId);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          MalaSafe · Monthly Close Operations
        </p>
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight">
          Monthly Close
        </h1>
        <p className="max-w-prose text-base leading-relaxed text-muted-foreground">
          View monthly close operations, backtest results, and model drift detection.
          Each close represents a month-end batch process that validates predictions
          and updates the forecasting model.
        </p>
      </header>

      {closesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading monthly closes...</p>
          </div>
        </div>
      ) : !closes || closes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-16">
          <Calendar className="mb-4 h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
          <h3 className="mb-2 text-lg font-semibold">No Monthly Closes Yet</h3>
          <p className="text-sm text-muted-foreground">
            Monthly closes are created automatically after malaria data uploads.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Sidebar - List of Closes */}
          <div className="flex flex-col gap-2">
            <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Recent Closes
            </p>
            <div className="flex flex-col gap-1">
              {closes.map((close) => (
                <button
                  key={close.id}
                  onClick={() => setSelectedCloseId(close.id)}
                  className={`flex flex-col gap-1 rounded-lg border px-4 py-3 text-left transition-all ${
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
                  <span className="text-xs text-muted-foreground">
                    {close.mode === "close" ? "Full Close" : "Backfill"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col gap-6">
            {selectedClose && (
              <>
                {/* Close Details */}
                <div className="rounded-lg border border-border bg-card p-6">
                  <h2 className="mb-4 text-xl font-semibold">
                    {format(new Date(selectedClose.month), "MMMM yyyy")} Close
                  </h2>
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
                  <div className="rounded-lg border border-border bg-card p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                      <TrendingUp className="h-5 w-5" strokeWidth={1.5} />
                      Backtest Results
                    </h3>
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
                  <div className="rounded-lg border border-border bg-card p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                      <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
                      Drift Findings
                    </h3>
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
