"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type {
  UploadPreviewResponse,
  UploadError,
  UploadKind,
} from "@/types/upload";
import type { LocalPreviewResult } from "@/lib/csv-preview";

interface UploadPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  kind: UploadKind;

  /** Synchronous client-side preview, available immediately when the modal opens. */
  localPreview: LocalPreviewResult | null;

  /** Server dry-run result, loaded asynchronously after the modal opens. */
  serverPreview: UploadPreviewResponse | null;
  loadingServer: boolean;

  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
  confirming?: boolean;
}

export function UploadPreviewDialog({
  open,
  onOpenChange,
  fileName,
  kind,
  localPreview,
  serverPreview,
  loadingServer,
  onConfirm,
  onCancel,
  confirmDisabled = false,
  confirming = false,
}: UploadPreviewDialogProps) {
  // Prefer server numbers when available; fall back to client-side counts
  // for the immediate "modal opens with something" feel.
  const summary = useMemo(() => {
    if (serverPreview) {
      const s = serverPreview.summary;
      return {
        total: s.total_rows,
        valid: s.valid_rows,
        skipped: s.skipped_rows,
        duplicates: s.duplicate_rows,
        months: s.distinct_months,
        mode: s.predicted_mode ?? null,
      };
    }
    return {
      total: localPreview?.totalRows ?? 0,
      valid: localPreview?.validRows.length ?? 0,
      skipped: localPreview?.invalidRows.length ?? 0,
      duplicates: 0,
      months: localPreview?.distinctMonths ?? [],
      mode: localPreview?.predictedMode ?? null,
    };
  }, [serverPreview, localPreview]);

  const validRows = serverPreview
    ? serverPreview.valid_sample.map((r) => ({ rowNumber: r.row_number, data: r.data }))
    : localPreview?.validRows ?? [];
  const invalidRows: UploadError[] = serverPreview
    ? serverPreview.invalid_rows
    : localPreview?.invalidRows ?? [];
  const duplicateRows: UploadError[] = serverPreview?.duplicate_rows ?? [];
  const fileErrors: UploadError[] = serverPreview
    ? serverPreview.file_errors
    : localPreview?.fileErrors ?? [];

  const validColumns = inferColumns(validRows.map((r) => r.data));
  const validSampleRows = validRows.slice(0, 50);

  const hasFileBlocker = fileErrors.length > 0;
  const nothingToImport = summary.valid === 0 && !hasFileBlocker;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl gap-0 border-border bg-popover p-0 sm:rounded-sm"
      >
        {/* Top eyebrow + title */}
        <DialogHeader className="space-y-3 border-b border-border px-6 pb-5 pt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Review · {kind} upload
          </p>
          <DialogTitle className="font-display font-semibold text-2xl leading-tight">
            {fileName}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-xs text-muted-foreground tabular-nums">
              <span>{summary.total} rows</span>
              <span aria-hidden>·</span>
              <span>{summary.months.length} month{summary.months.length === 1 ? "" : "s"}</span>
              {summary.mode && (
                <>
                  <span aria-hidden>·</span>
                  <span className="uppercase tracking-[0.18em]">{summary.mode}</span>
                </>
              )}
              {loadingServer && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 aria-hidden className="size-3 animate-spin" />
                  checking against database…
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Summary counts strip */}
        {!confirming && (
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            <SummaryCell label="Valid" value={summary.valid} tone="valid" />
            <SummaryCell label="Skipped" value={summary.skipped} tone="warn" />
            <SummaryCell label="Duplicates" value={summary.duplicates} tone="error" />
          </div>
        )}

        {/* Uploading state - replaces tabs while the request is in flight. */}
        {confirming && (
          <div className="flex flex-col items-center justify-center gap-4 border-b border-border px-6 py-16 text-center">
            <Loader2 aria-hidden className="size-7 animate-spin text-muted-foreground" strokeWidth={1.5} />
            <p className="font-display font-semibold text-lg">Importing…</p>
            <p className="max-w-sm font-sans text-sm text-muted-foreground">
              Writing rows to the database, then dispatching the close pipeline. This usually finishes in a few seconds.
            </p>
          </div>
        )}

        {/* File-level blocker - disables the confirm button. */}
        {!confirming && hasFileBlocker && (
          <div className="border-b border-border px-6 py-4">
            <Alert
              variant="destructive"
              className="border-status-error/40 bg-status-error-tint text-foreground"
            >
              <AlertTriangle aria-hidden className="size-4" />
              <AlertTitle className="font-display font-semibold">File cannot be imported</AlertTitle>
              <AlertDescription className="font-sans text-sm">
                {fileErrors.map((e, i) => (
                  <span key={i} className="block">{e.error}</span>
                ))}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Tabs: Valid / Invalid / Duplicates */}
        {!confirming && !hasFileBlocker && (
          <Tabs defaultValue="valid" className="px-6 pt-4">
            <TabsList className="h-auto gap-1 border-b border-border bg-transparent p-0">
              <TabBadge value="valid" label="Valid" count={summary.valid} tone="valid" />
              <TabBadge value="invalid" label="Invalid" count={summary.skipped} tone="warn" />
              <TabBadge value="duplicates" label="Duplicates" count={summary.duplicates} tone="error" />
            </TabsList>

            <TabsContent value="valid" className="mt-0">
              {validSampleRows.length > 0 ? (
                <ScrollArea className="h-[320px] -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="w-[64px] font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Row</TableHead>
                        {validColumns.map((c) => (
                          <TableHead
                            key={c}
                            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                          >
                            {c}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validSampleRows.map((r, i) => (
                        <TableRow key={i} className="border-border/60">
                          <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                            {r.rowNumber || "-"}
                          </TableCell>
                          {validColumns.map((c) => (
                            <TableCell
                              key={c}
                              className="font-mono text-xs tabular-nums"
                            >
                              {formatCell(r.data[c])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <EmptyTab
                  icon={nothingToImport ? AlertTriangle : CheckCircle2}
                  label={nothingToImport ? "No valid rows in this file" : "All rows valid"}
                  hint={
                    nothingToImport
                      ? "Fix the issues in the Invalid tab and re-upload."
                      : "Server-side checks may still find duplicates - see other tabs."
                  }
                  tone={nothingToImport ? "warn" : "valid"}
                />
              )}
              {validSampleRows.length > 0 && summary.valid > validSampleRows.length && (
                <p className="px-1 py-3 text-xs text-muted-foreground">
                  Showing first {validSampleRows.length} of {summary.valid} valid rows.
                </p>
              )}
            </TabsContent>

            <TabsContent value="invalid" className="mt-0">
              <ErrorList rows={invalidRows} emptyLabel="No invalid rows - this file will import cleanly." />
            </TabsContent>

            <TabsContent value="duplicates" className="mt-0">
              <ErrorList
                rows={duplicateRows}
                emptyLabel={
                  loadingServer
                    ? "Checking duplicates against the database…"
                    : "No duplicates against the database."
                }
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Footer */}
        <DialogFooter className="flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
          <p className="font-mono text-[11px] text-muted-foreground">
            {confirming
              ? "Don't close this tab until the import finishes."
              : summary.valid > 0
                ? `${summary.valid} row${summary.valid === 1 ? "" : "s"} will be imported. Bad rows are listed but skipped.`
                : "Nothing to import yet."}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={confirming}
              className="font-mono text-[12px] uppercase tracking-[0.18em]"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={confirmDisabled || hasFileBlocker || nothingToImport || confirming}
              className="font-mono text-[12px] uppercase tracking-[0.18em]"
            >
              {confirming ? (
                <>
                  <Loader2 aria-hidden className="mr-2 size-3.5 animate-spin" />
                  Uploading
                </>
              ) : (
                <>Confirm import</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface SummaryCellProps {
  label: string;
  value: number;
  tone: "valid" | "warn" | "error";
}
function SummaryCell({ label, value, tone }: SummaryCellProps) {
  const toneClass = tone === "valid" ? "status-valid" : tone === "warn" ? "status-warn" : "status-error";
  return (
    <div className="flex flex-col gap-1.5 px-6 py-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className={`font-display text-3xl leading-none tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

interface TabBadgeProps {
  value: string;
  label: string;
  count: number;
  tone: "valid" | "warn" | "error";
}
function TabBadge({ value, label, count, tone }: TabBadgeProps) {
  const toneClass = tone === "valid" ? "status-valid" : tone === "warn" ? "status-warn" : "status-error";
  return (
    <TabsTrigger
      value={value}
      className="group rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 pb-2.5 pt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
    >
      <span>{label}</span>
      <Badge
        variant="outline"
        className={`ml-2 rounded-none border-border bg-transparent px-1.5 font-mono text-[10px] tabular-nums ${toneClass}`}
      >
        {count}
      </Badge>
    </TabsTrigger>
  );
}

function ErrorList({ rows, emptyLabel }: { rows: UploadError[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return (
      <div className="px-1 py-12 text-center font-sans text-sm text-muted-foreground">{emptyLabel}</div>
    );
  }
  return (
    <ScrollArea className="h-[320px] -mx-6 px-6">
      <ul className="flex flex-col">
        {rows.map((e, i) => (
          <li
            key={i}
            className="flex items-start gap-4 border-b border-border/60 py-3 last:border-0"
          >
            <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              row {e.row ?? "-"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm text-foreground">{e.error}</p>
              {(e.column || e.value) && (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {e.column ? <span>{e.column}</span> : null}
                  {e.column && e.value ? <span aria-hidden> · </span> : null}
                  {e.value ? <span>value: {e.value}</span> : null}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

interface EmptyTabProps {
  icon: typeof AlertTriangle;
  label: string;
  hint: string;
  tone: "valid" | "warn" | "error";
}
function EmptyTab({ icon: Icon, label, hint, tone }: EmptyTabProps) {
  const toneClass = tone === "valid" ? "status-valid" : tone === "warn" ? "status-warn" : "status-error";
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-center">
      <Icon aria-hidden className={`size-6 ${toneClass}`} strokeWidth={1.5} />
      <p className="font-display font-semibold text-base">{label}</p>
      <p className="max-w-xs font-sans text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function inferColumns(rows: Array<Record<string, string | number | null>>): string[] {
  if (rows.length === 0) return [];
  const cols = new Set<string>();
  for (const row of rows.slice(0, 10)) {
    for (const k of Object.keys(row)) cols.add(k);
  }
  // Prefer a domain-friendly order.
  const preferred = ["organisationunitid", "eth_month_year", "positive", "tests", "travel", "date", "rainfall", "temperature"];
  const ordered = preferred.filter((c) => cols.has(c));
  for (const c of cols) if (!ordered.includes(c)) ordered.push(c);
  return ordered;
}

function formatCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}
