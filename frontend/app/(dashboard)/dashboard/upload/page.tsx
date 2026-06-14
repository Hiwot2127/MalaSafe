"use client";

import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { uploadsApi } from "@/lib/api/uploads";
import { parseLocalPreview, type LocalPreviewResult } from "@/lib/csv-preview";
import type {
  UploadResponse,
  UploadEDAResponse,
  UploadKind,
  StageResult,
} from "@/types/upload";

import { UploadDropzone, SelectedFileChip } from "@/components/upload/upload-dropzone";
import { UploadPreviewDialog } from "@/components/upload/upload-preview-dialog";
import { UploadTimeline } from "@/components/upload/upload-timeline";
import { AlertBanner } from "@/components/editorial";
import { cn } from "@/lib/utils";

type PageState =
  | { kind: "idle" }
  | { kind: "previewing"; file: File; local: LocalPreviewResult | null; server: UploadEDAResponse | null; loadingServer: boolean }
  | { kind: "uploading"; file: File }
  | { kind: "done"; result: UploadResponse; file: File };

// UI-only enum. `weekly` doesn't have a real backend endpoint yet — the model
// and CSV pipeline are monthly-only — but it stays visible in the picker so
// users know it's a planned surface. Selecting it shows an info banner.
type UploadTypeUI = "monthly" | "weekly" | "climate";

const KIND_LABEL: Record<UploadTypeUI, string> = {
  monthly: "Monthly malaria",
  weekly: "Weekly malaria",
  climate: "Climate",
};

export default function UploadPage() {
  const [uploadType, setUploadType] = useState<UploadTypeUI>("monthly");
  const [state, setState] = useState<PageState>({ kind: "idle" });

  const weeklySelected = uploadType === "weekly";
  // Narrowed kind for backend / preview / parser calls. Weekly never actually
  // fires any of these (the picker swaps in an info banner), so this fallback
  // exists only to keep the type system happy.
  const backendKind: UploadKind = weeklySelected ? "monthly" : uploadType;

  // File picked → kick off local preview + (for monthly) server dry-run in parallel.
  const handleFile = useCallback(
    async (file: File) => {
      // Open the modal immediately with a placeholder so the UI never blocks.
      setState({ kind: "previewing", file, local: null, server: null, loadingServer: backendKind === "monthly" || backendKind === "climate" });

      // Client-side parse - should be sub-second even on large files.
      const local = await parseLocalPreview(file, backendKind);
      setState((prev) =>
        prev.kind === "previewing" && prev.file === file
          ? { ...prev, local }
          : prev,
      );

      // Server dry-run now available for both monthly and climate uploads
      if (backendKind !== "monthly" && backendKind !== "climate") {
        setState((prev) =>
          prev.kind === "previewing" && prev.file === file
            ? { ...prev, loadingServer: false }
            : prev,
        );
        return;
      }

      try {
        const server = backendKind === "monthly"
          ? await uploadsApi.previewMonthlyMalariaUploadWithEDA(file)
          : await uploadsApi.previewClimateUpload(file);
        setState((prev) =>
          prev.kind === "previewing" && prev.file === file
            ? { ...prev, server, loadingServer: false }
            : prev,
        );
      } catch (err: unknown) {
        const message = extractErrorMessage(err) ?? "Preview check failed";
        toast.error("Could not run server-side preview", { description: message });
        setState((prev) =>
          prev.kind === "previewing" && prev.file === file
            ? { ...prev, loadingServer: false }
            : prev,
        );
      }
    },
    [backendKind],
  );

  const handleConfirmUpload = useCallback(async () => {
    if (state.kind !== "previewing") return;
    const file = state.file;
    setState({ kind: "uploading", file });

    try {
      const response =
        backendKind === "climate"
          ? await uploadsApi.uploadClimate(file)
          : await uploadsApi.uploadMalaria(file);

      if (response.success) {
        toast.success(`${response.records_created} rows imported`, {
          description: response.records_skipped > 0
            ? `${response.records_skipped} rows skipped - see timeline.`
            : undefined,
        });
      } else {
        toast.warning("Imported with skipped rows", {
          description: `${response.records_created} created, ${response.records_skipped} skipped.`,
        });
      }
      setState({ kind: "done", result: response, file });
    } catch (err: unknown) {
      toast.error("Upload failed", { description: extractErrorMessage(err) ?? "Unknown error" });
      setState({ kind: "idle" });
    }
  }, [state, backendKind]);

  const handleCancelPreview = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  const handleReset = useCallback(() => {
    setState({ kind: "idle" });
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    if (weeklySelected) {
      toast.info("Weekly template not available yet — the pipeline is monthly-only.");
      return;
    }
    try {
      const blob =
        backendKind === "climate"
          ? await uploadsApi.downloadClimateTemplate()
          : await uploadsApi.downloadMalariaTemplate();
      const filename =
        backendKind === "climate" ? "climate_template.csv" : "monthly_malaria_template.csv";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      toast.error("Could not download template", { description: extractErrorMessage(err) ?? undefined });
    }
  }, [backendKind, weeklySelected]);

  const previewOpen = state.kind === "previewing" || state.kind === "uploading";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 py-8">
      {/* Editorial header */}
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          MalaSafe · Surveillance ingest
        </p>
        <h1 className="font-display font-semibold text-4xl leading-[1.05] tracking-tight">Upload data</h1>
        <p className="max-w-prose font-sans text-base leading-relaxed text-muted-foreground">
          Drop a malaria or climate CSV. Rows with issues are skipped; successful rows still import. Monthly malaria uploads also trigger a backtest,
          drift check, and re-prediction for the following month.
        </p>
      </header>

      {/* Section 001 - Type */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="001" label="Data type" />
        <fieldset className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3">
          <legend className="sr-only">Upload type</legend>
          {(Object.keys(KIND_LABEL) as UploadTypeUI[]).map((kind) => (
            <TypeOption
              key={kind}
              kind={kind}
              checked={uploadType === kind}
              onSelect={() => {
                setUploadType(kind);
                if (state.kind !== "idle") setState({ kind: "idle" });
              }}
            />
          ))}
        </fieldset>
      </section>

      {/* Section 002 - File */}
      <section className="flex flex-col gap-5">
        <SectionHeader index="002" label="File">
          {weeklySelected ? null : (
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Download aria-hidden className="size-3.5" strokeWidth={1.5} />
              Example CSV
            </button>
          )}
        </SectionHeader>

        {weeklySelected ? (
          <AlertBanner
            tone="info"
            title="Weekly imports coming soon"
            description="The reporting pipeline currently ingests monthly aggregates only — the CSV schema, validator, and forecast model all run at month-level. ISO-week ingest will land once the upload schema supports weekly rows. Switch to Monthly malaria above to upload now."
          />
        ) : (
          <>
            <UploadDropzone onFile={handleFile} disabled={state.kind === "uploading"} />
            {state.kind === "previewing" && (
              <SelectedFileChip file={state.file} onClear={handleCancelPreview} />
            )}
            {state.kind === "done" && (
              <SelectedFileChip file={state.file} onClear={handleReset} />
            )}
          </>
        )}
      </section>

      {/* Section 003 - Timeline (only after a real upload) */}
      {state.kind === "done" && (
        <section className="flex flex-col gap-5">
          <SectionHeader index="003" label="Timeline">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {state.result.records_created} of {state.result.records_processed} imported
            </span>
          </SectionHeader>
          <UploadTimeline
            stages={(state.result.stages as StageResult[] | undefined) ?? []}
            monthlyCloseId={state.result.monthly_close_id ?? null}
            monthlyCloseMode={state.result.monthly_close_mode ?? null}
          />
          {state.result.errors.length > 0 && (
            <details className="border border-border bg-card">
              <summary className="flex cursor-pointer items-center justify-between border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
                <span>{state.result.errors.length} row{state.result.errors.length === 1 ? "" : "s"} skipped</span>
                <span aria-hidden>▾</span>
              </summary>
              <ul className="flex flex-col">
                {state.result.errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-4 border-b border-border/60 px-4 py-2.5 last:border-0">
                    <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      row {e.row ?? "-"}
                    </span>
                    <p className="font-sans text-sm">{e.error}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      <UploadPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open && state.kind !== "uploading") handleCancelPreview();
        }}
        fileName={state.kind === "previewing" || state.kind === "uploading" ? state.file.name : ""}
        kind={backendKind}
        localPreview={state.kind === "previewing" ? state.local : null}
        serverPreview={state.kind === "previewing" ? state.server : null}
        loadingServer={state.kind === "previewing" && state.loadingServer}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelPreview}
        confirming={state.kind === "uploading"}
      />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface SectionHeaderProps {
  index: string;
  label: string;
  children?: React.ReactNode;
}
function SectionHeader({ index, label, children }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
      <div className="flex items-baseline gap-3.5">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{index}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

interface TypeOptionProps {
  kind: UploadTypeUI;
  checked: boolean;
  onSelect: () => void;
}
function TypeOption({ kind, checked, onSelect }: TypeOptionProps) {
  // Two mutually exclusive class sets so the active (navy) state isn't
  // lightened by a stale `hover:bg-secondary` from the base classes.
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={cn(
        "group flex flex-col items-start gap-1 px-5 py-4 text-left transition-colors",
        checked
          ? "bg-primary text-primary-foreground hover:bg-primary"
          : "bg-card text-foreground hover:bg-secondary",
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-60">
        {kind}
      </span>
      <span className="font-display font-semibold text-base leading-tight">
        {KIND_LABEL[kind]}
      </span>
    </button>
  );
}

function extractErrorMessage(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  // axios-shaped error
  const maybe = err as { response?: { data?: { detail?: string } }; message?: string };
  return maybe.response?.data?.detail ?? maybe.message;
}
