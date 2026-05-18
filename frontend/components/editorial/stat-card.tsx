import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorialCard, StatusPill, type StatusKind } from "./index";

type Tone = "signal" | "valid" | "warn" | "error" | null;

const TONE_STRIP: Record<NonNullable<Tone>, string> = {
  signal: "bg-accent-signal",
  valid: "bg-status-valid",
  warn: "bg-status-warn",
  error: "bg-status-error",
};

interface StatCardProps {
  eyebrow: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  /** Optional change indicator (e.g. +12.4% week-over-week). */
  delta?: { value: string; direction: "up" | "down" | "flat"; status?: StatusKind };
  /** Optional lucide icon component, rendered top-right. */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Optional left tone strip. */
  tone?: Tone;
  className?: string;
}

export function StatCard({
  eyebrow,
  value,
  caption,
  delta,
  icon: Icon,
  tone = null,
  className,
}: StatCardProps) {
  const DeltaIcon =
    delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : Minus;

  return (
    <EditorialCard className={cn("relative overflow-hidden p-5", className)}>
      {tone ? (
        <span
          aria-hidden
          className={cn("absolute inset-y-3 left-0 w-[3px] rounded-r", TONE_STRIP[tone])}
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        {Icon ? (
          <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        ) : null}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold leading-none tabular-nums tracking-[-0.022em] text-foreground">
        {value}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {delta ? (
          <StatusPill kind={delta.status ?? (delta.direction === "down" ? "error" : "valid")}>
            <DeltaIcon className="mr-1 inline size-3" strokeWidth={2} />
            {delta.value}
          </StatusPill>
        ) : null}
        {caption ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {caption}
          </p>
        ) : null}
      </div>
    </EditorialCard>
  );
}
