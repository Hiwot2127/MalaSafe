"use client";

import { CheckCircle2, AlertTriangle, MinusCircle, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { StageResult } from "@/types/upload";
import { cn } from "@/lib/utils";

interface UploadTimelineProps {
  stages: StageResult[];
  /** When set, a "View close pipeline" link appears at the end. */
  monthlyCloseId?: string | null;
  monthlyCloseMode?: string | null;
}

const STAGE_TITLES: Record<string, string> = {
  parse: "Parse CSV",
  validate: "Validate rows",
  insert: "Insert records",
  dispatch_close: "Close pipeline",
};

export function UploadTimeline({ stages, monthlyCloseId, monthlyCloseMode }: UploadTimelineProps) {
  // Defensive - older backend builds returned UploadResponse without a `stages`
  // field, and our page passes it through as-is. Don't crash; render nothing.
  if (!stages || stages.length === 0) return null;

  return (
    <ol className="flex flex-col">
      {stages.map((stage, idx) => {
        const last = idx === stages.length - 1;
        return (
          <li
            key={`${stage.name}-${idx}`}
            className="stage-reveal grid grid-cols-[24px_1fr] gap-x-4"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            {/* Dot + connector rail */}
            <div className="flex flex-col items-center">
              <StageDot status={stage.status} />
              {!last && <span aria-hidden className="my-1 w-px flex-1 bg-border" />}
            </div>

            {/* Stage body */}
            <div className={cn("flex-1 pb-6", last && "pb-1")}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display font-semibold text-base leading-none text-foreground">
                  {STAGE_TITLES[stage.name] ?? stage.name}
                </span>
                {typeof stage.count === "number" && (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {stage.count} {stage.count === 1 ? "row" : "rows"}
                  </span>
                )}
                {typeof stage.duration_ms === "number" && (
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                    {stage.duration_ms} ms
                  </span>
                )}
              </div>
              {stage.detail && (
                <p className="mt-1.5 font-sans text-sm text-muted-foreground">{stage.detail}</p>
              )}

              {stage.name === "dispatch_close" && monthlyCloseId && (
                <Link
                  href={`/monthly-close/${monthlyCloseId}`}
                  className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary underline-offset-4 hover:underline"
                >
                  View close pipeline
                  <ExternalLink aria-hidden className="size-3" />
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StageDot({ status }: { status: string }) {
  if (status === "ok") {
    return (
      <span className="grid size-6 place-items-center bg-card status-valid">
        <CheckCircle2 aria-hidden className="size-5" strokeWidth={1.5} />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="grid size-6 place-items-center bg-card status-error">
        <AlertTriangle aria-hidden className="size-5" strokeWidth={1.5} />
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="grid size-6 place-items-center bg-card text-muted-foreground">
        <MinusCircle aria-hidden className="size-5" strokeWidth={1.5} />
      </span>
    );
  }
  // running / unknown
  return (
    <span className="grid size-6 place-items-center bg-card text-muted-foreground">
      <Loader2 aria-hidden className="size-5 animate-spin" strokeWidth={1.5} />
    </span>
  );
}
