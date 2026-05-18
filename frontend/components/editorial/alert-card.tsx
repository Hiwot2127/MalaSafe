import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "valid" | "warn" | "error";

const TONE_STYLES: Record<
  Tone,
  {
    card: string;
    badge: string;
    icon: string;
    Component: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }
> = {
  info: {
    card: "border-accent-signal/30",
    badge: "bg-accent-signal-tint",
    icon: "text-accent-signal",
    Component: Info,
  },
  valid: {
    card: "border-status-valid/30",
    badge: "bg-status-valid-tint",
    icon: "status-valid",
    Component: CheckCircle2,
  },
  warn: {
    card: "border-status-warn/30",
    badge: "bg-status-warn-tint",
    icon: "status-warn",
    Component: AlertTriangle,
  },
  error: {
    card: "border-status-error/30",
    badge: "bg-status-error-tint",
    icon: "status-error",
    Component: XCircle,
  },
};

interface AlertCardProps {
  tone?: Tone;
  /** Mono micro-label rendered above the title. */
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  /** Optional inline CTA. Either an href or a button-like onClick. */
  cta?:
    | { label: string; href: string }
    | { label: string; onClick: () => void };
  className?: string;
}

export function AlertCard({
  tone = "info",
  eyebrow,
  title,
  description,
  cta,
  className,
}: AlertCardProps) {
  const { card, badge, icon, Component: Icon } = TONE_STYLES[tone];
  return (
    <section
      className={cn(
        "relative flex flex-col gap-5 rounded-[var(--radius)] border-2 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:p-8",
        card,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-14 shrink-0 items-center justify-center rounded-xl",
          badge,
        )}
      >
        <Icon className={cn("size-7", icon)} strokeWidth={1.75} />
      </span>
      <div className="flex flex-1 flex-col gap-2">
        {eyebrow ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-2xl font-semibold leading-tight tracking-[-0.018em] text-foreground sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {cta ? (
        "href" in cta ? (
          <Link
            href={cta.href}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-border bg-card px-4 py-2.5 font-sans text-sm font-medium text-foreground shadow-sm transition-all hover:bg-secondary hover:shadow"
          >
            {cta.label}
            <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
          </Link>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-border bg-card px-4 py-2.5 font-sans text-sm font-medium text-foreground shadow-sm transition-all hover:bg-secondary hover:shadow"
          >
            {cta.label}
            <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
          </button>
        )
      ) : null}
    </section>
  );
}
