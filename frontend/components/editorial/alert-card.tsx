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

interface AlertCardStat {
  value: React.ReactNode;
  label: string;
}

interface AlertCardProps {
  tone?: Tone;
  /** Mono micro-label rendered above the title. */
  eyebrow?: string;
  /** Headline. Kept short — the stats below carry the weight. */
  title: string;
  /** One-line context under the stats. */
  description?: React.ReactNode;
  /** Lead-with-the-numbers slot. When provided, takes visual priority over
   *  the title. Use for alerts where the magnitude is the message
   *  (e.g. "23,264 alerts open across 516 districts"). */
  stats?: AlertCardStat[];
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
  stats,
  cta,
  className,
}: AlertCardProps) {
  const { card, badge, icon, Component: Icon } = TONE_STYLES[tone];
  const ctaButtonClass =
    "inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-border bg-card px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-secondary";

  return (
    <section
      className={cn(
        "relative flex flex-col gap-4 rounded-[var(--radius)] border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:gap-5 sm:p-5",
        card,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-lg",
          badge,
        )}
      >
        <Icon className={cn("size-5", icon)} strokeWidth={1.75} />
      </span>

      <div className="flex flex-1 flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {eyebrow ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </span>
          ) : null}
          <h2 className="font-display text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
        </div>

        {stats && stats.length > 0 ? (
          <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {stats.map((stat, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="font-display text-2xl font-semibold leading-none tabular-nums tracking-[-0.022em] text-foreground sm:text-3xl">
                  {stat.value}
                </dd>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
          </dl>
        ) : null}

        {description ? (
          <p className="font-sans text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {cta ? (
        "href" in cta ? (
          <Link href={cta.href} className={ctaButtonClass}>
            {cta.label}
            <ArrowRight className="size-3.5" strokeWidth={1.5} aria-hidden />
          </Link>
        ) : (
          <button type="button" onClick={cta.onClick} className={ctaButtonClass}>
            {cta.label}
            <ArrowRight className="size-3.5" strokeWidth={1.5} aria-hidden />
          </button>
        )
      ) : null}
    </section>
  );
}
