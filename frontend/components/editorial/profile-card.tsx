import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorialCard } from "./index";

type Tone = "primary" | "signal" | "valid" | "warn" | "error";

const TONE_CIRCLE: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  signal: "bg-accent-signal-tint text-accent-signal",
  valid: "bg-status-valid-tint status-valid",
  warn: "bg-status-warn-tint status-warn",
  error: "bg-status-error-tint status-error",
};

interface ProfileCardProps {
  icon: LucideIcon;
  /** Field name (e.g. "Email"). */
  label: string;
  /** Field value. Strings render in mono tabular; React nodes render verbatim. */
  value: React.ReactNode;
  /** Optional secondary line (e.g. "verified · 2 days ago"). */
  meta?: React.ReactNode;
  /** Tone tints the icon circle. */
  tone?: Tone;
  /** Optional slot for an inline action (Edit button, etc). */
  action?: React.ReactNode;
  className?: string;
}

export function ProfileCard({
  icon: Icon,
  label,
  value,
  meta,
  tone = "primary",
  action,
  className,
}: ProfileCardProps) {
  return (
    <EditorialCard className={cn("flex items-start gap-4 p-5", className)}>
      <span
        aria-hidden
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
          TONE_CIRCLE[tone],
        )}
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <p className="truncate font-sans text-base font-medium leading-tight text-foreground">
          {value}
        </p>
        {meta ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {meta}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </EditorialCard>
  );
}
