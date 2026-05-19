import * as React from "react";
import { ArrowDownRight, ArrowUpRight, HelpCircle, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorialCard, StatusPill, type StatusKind } from "./index";

type Tone = "signal" | "valid" | "warn" | "error" | null;

const TONE_STRIP: Record<NonNullable<Tone>, string> = {
  signal: "bg-accent-signal",
  valid: "bg-status-valid",
  warn: "bg-status-warn",
  error: "bg-status-error",
};

// Tinted-circle backgrounds for the icon when iconStyle="circle".
// Falls back to a neutral primary tint when no tone is set.
const TONE_CIRCLE: Record<NonNullable<Tone>, string> = {
  signal: "bg-accent-signal-tint text-accent-signal",
  valid: "bg-status-valid-tint status-valid",
  warn: "bg-status-warn-tint status-warn",
  error: "bg-status-error-tint status-error",
};
const NEUTRAL_CIRCLE = "bg-primary/10 text-primary";

interface StatCardProps {
  eyebrow: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  /** Optional change indicator (e.g. +12.4% week-over-week). */
  delta?: { value: string; direction: "up" | "down" | "flat"; status?: StatusKind };
  /** Optional lucide icon component. */
  icon?: LucideIcon;
  /** Optional left tone strip. */
  tone?: Tone;
  /**
   * "topright" - icon sits muted in the top-right (original behaviour).
   * "circle"   - icon sits inside a tinted square at the top-left, colored
   *              from the tone palette. Default in new pages.
   */
  iconStyle?: "topright" | "circle";
  /** Plain-text explanation rendered as a native hover tooltip on a help icon
   *  next to the eyebrow. Use this to disambiguate KPI labels — what the
   *  number counts, what window it covers, what thresholds apply. */
  help?: string;
  className?: string;
}

export function StatCard({
  eyebrow,
  value,
  caption,
  delta,
  icon: Icon,
  tone = null,
  iconStyle = "circle",
  help,
  className,
}: StatCardProps) {
  const DeltaIcon =
    delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : Minus;
  const circleClass = tone ? TONE_CIRCLE[tone] : NEUTRAL_CIRCLE;

  return (
    <EditorialCard className={cn("relative overflow-hidden p-5", className)}>
      {tone ? (
        <span
          aria-hidden
          className={cn("absolute inset-y-3 left-0 w-[3px] rounded-r", TONE_STRIP[tone])}
        />
      ) : null}

      {iconStyle === "circle" && Icon ? (
        <div className="mb-3 flex items-center gap-3">
          <span
            aria-hidden
            className={cn("inline-flex size-10 items-center justify-center rounded-xl", circleClass)}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
            {help ? <HelpIndicator text={help} /> : null}
          </p>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
            {help ? <HelpIndicator text={help} /> : null}
          </p>
          {Icon ? (
            <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          ) : null}
        </div>
      )}

      <p
        className={cn(
          "font-display text-3xl font-semibold leading-none tabular-nums tracking-[-0.022em] text-foreground",
          iconStyle === "circle" ? "mt-0" : "mt-3",
        )}
      >
        {value}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
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

function HelpIndicator({ text }: { text: string }) {
  return (
    <span
      aria-label={text}
      title={text}
      tabIndex={0}
      className="inline-flex cursor-help text-muted-foreground/70 transition-colors hover:text-foreground focus:text-foreground focus:outline-none"
    >
      <HelpCircle aria-hidden className="size-3" strokeWidth={1.75} />
    </span>
  );
}
