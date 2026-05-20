import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "valid" | "warn" | "error";

const TONE_STYLES: Record<
  Tone,
  {
    rail: string;
    pill: string;
    dot: string;
    ctaFilled: string;
  }
> = {
  info: {
    rail: "bg-accent-signal",
    pill: "bg-accent-signal-tint text-foreground",
    dot: "bg-accent-signal",
    ctaFilled: "bg-accent-signal text-primary-foreground hover:opacity-90",
  },
  valid: {
    rail: "bg-status-valid",
    pill: "bg-status-valid-tint text-foreground",
    dot: "bg-status-valid",
    ctaFilled: "bg-status-valid text-primary-foreground hover:opacity-90",
  },
  warn: {
    rail: "bg-status-warn",
    pill: "bg-status-warn-tint text-foreground",
    dot: "bg-status-warn",
    ctaFilled: "bg-status-warn text-foreground hover:opacity-90",
  },
  error: {
    rail: "bg-status-error",
    pill: "bg-status-error-tint text-foreground",
    dot: "bg-status-error",
    ctaFilled: "bg-status-error text-primary-foreground hover:opacity-90",
  },
};

interface AlertCardStat {
  value: React.ReactNode;
  label: string;
}

interface AlertCardProps {
  tone?: Tone;
  /** Mono micro-label rendered as a status pill above the title. */
  eyebrow?: string;
  /** Headline. Kept short — the stats below carry the magnitude. */
  title: string;
  /** One-line context under the stats. */
  description?: React.ReactNode;
  /** Hero stats slot. First item gets visual priority; additional items
   *  appear alongside, divided by a hairline rule. Use for alerts where
   *  the magnitude is the message. */
  stats?: AlertCardStat[];
  /** Optional inline CTA. Filled for `error` tone, outlined otherwise. */
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
  const { rail, pill, dot, ctaFilled } = TONE_STYLES[tone];

  const ctaClass = cn(
    "group/cta inline-flex shrink-0 items-center gap-2 self-start rounded-md px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] transition-all",
    tone === "error"
      ? ctaFilled
      : "border border-border bg-card text-foreground hover:bg-secondary",
  );

  const ctaInner = cta ? (
    <>
      {cta.label}
      <ArrowRight
        className="size-3.5 transition-transform group-hover/cta:translate-x-0.5"
        strokeWidth={1.75}
        aria-hidden
      />
    </>
  ) : null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm",
        className,
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", rail)} />

      <div className="flex flex-col gap-6 p-5 pl-6 sm:p-6 sm:pl-7 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="flex flex-1 flex-col gap-5 min-w-0">
          <div className="flex flex-col gap-2.5">
            {eyebrow ? (
              <span
                className={cn(
                  "inline-flex items-center gap-2 self-start rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em]",
                  pill,
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", dot)}
                />
                {eyebrow}
              </span>
            ) : null}
            <h2 className="font-display text-xl font-semibold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-2xl">
              {title}
            </h2>
          </div>

          {stats && stats.length > 0 ? (
            <dl className="flex flex-wrap items-end gap-x-8 gap-y-5 border-t border-border pt-5 sm:gap-x-10">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col gap-1.5",
                    i > 0 && "sm:border-l sm:border-border sm:pl-8 lg:pl-10",
                  )}
                >
                  <dd className="font-display text-[2rem] font-semibold leading-none tabular-nums tracking-[-0.026em] text-foreground sm:text-[2.5rem]">
                    {stat.value}
                  </dd>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          ) : null}

          {description ? (
            <p className="max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {cta ? (
          "href" in cta ? (
            <Link href={cta.href} className={ctaClass}>
              {ctaInner}
            </Link>
          ) : (
            <button type="button" onClick={cta.onClick} className={ctaClass}>
              {ctaInner}
            </button>
          )
        ) : null}
      </div>
    </section>
  );
}
