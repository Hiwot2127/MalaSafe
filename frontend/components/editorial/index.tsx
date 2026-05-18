// Shared editorial primitives.
// Vocabulary lives in app/globals.css — Fraunces display, Manrope sans, IBM Plex
// Mono eyebrows, warm card surfaces, sharp 0.25rem corners, status tints.
// /upload and /monthly-close are the design references.

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Shared shell metrics ──────────────────────────────────────────────────

export const SHELL_BAR_HEIGHT = "h-[4.5rem]";

// ─── Page header ───────────────────────────────────────────────────────────

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.022em]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-prose font-sans text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </header>
  );
}

// ─── Section header ────────────────────────────────────────────────────────

type SectionTone = "signal" | "valid" | "warn" | "error" | null;

const SECTION_TONE_CLASS: Record<NonNullable<SectionTone>, string> = {
  signal: "bg-accent-signal",
  valid: "bg-status-valid",
  warn: "bg-status-warn",
  error: "bg-status-error",
};

interface SectionHeaderProps {
  index: string;
  label: string;
  tone?: SectionTone;
  children?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  index,
  label,
  tone = null,
  children,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-border pb-3",
        className,
      )}
    >
      <div className="flex items-baseline gap-3.5">
        {tone ? (
          <span
            aria-hidden
            className={cn("inline-block h-3 w-[3px] self-center", SECTION_TONE_CLASS[tone])}
          />
        ) : null}
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{index}</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-foreground">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── Editorial card surface ────────────────────────────────────────────────

interface EditorialCardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article" | "li";
  hover?: boolean;
}

export function EditorialCard({
  as = "div",
  className,
  hover = false,
  children,
  ...rest
}: EditorialCardProps) {
  const Tag = as as React.ElementType;
  return (
    <Tag
      className={cn(
        "border border-border bg-card",
        hover && "transition-colors hover:bg-accent-signal-tint",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ─── Metric ────────────────────────────────────────────────────────────────

interface MetricProps {
  eyebrow: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  status?: StatusKind | null;
  statusLabel?: string;
  className?: string;
}

export function Metric({ eyebrow, value, caption, status, statusLabel, className }: MetricProps) {
  return (
    <div className={cn("flex flex-col gap-2 p-5", className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {eyebrow}
      </p>
      <p className="font-display text-3xl font-semibold leading-none tabular-nums tracking-[-0.022em]">
        {value}
      </p>
      <div className="flex items-center gap-2 pt-1">
        {status ? <StatusPill kind={status}>{statusLabel ?? status}</StatusPill> : null}
        {caption ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Status pill ───────────────────────────────────────────────────────────

export type StatusKind = "valid" | "warn" | "error" | "neutral";

interface StatusPillProps {
  kind: StatusKind;
  children: React.ReactNode;
  className?: string;
}

export function StatusPill({ kind, children, className }: StatusPillProps) {
  const palette: Record<StatusKind, string> = {
    valid: "bg-status-valid-tint status-valid",
    warn: "bg-status-warn-tint status-warn",
    error: "bg-status-error-tint status-error",
    neutral: "bg-secondary text-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
        palette[kind],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─── Mono link / button ────────────────────────────────────────────────────

interface MonoActionProps extends React.HTMLAttributes<HTMLElement> {
  as?: "button" | "a";
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function MonoAction({
  as = "button",
  href,
  type = "button",
  disabled,
  icon,
  className,
  children,
  ...rest
}: MonoActionProps) {
  const classes = cn(
    "inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
    className,
  );
  if (as === "a") {
    return (
      <a href={href} className={classes} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {icon ? <span aria-hidden>{icon}</span> : null}
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled}
      className={classes}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {icon ? <span aria-hidden>{icon}</span> : null}
      {children}
    </button>
  );
}

// ─── Editorial select (replaces shadcn dropdown for now) ───────────────────

type EditorialSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function EditorialSelect({ className, children, ...rest }: EditorialSelectProps) {
  return (
    <select
      {...rest}
      className={cn(
        "appearance-none border border-input bg-card px-3 py-1.5 pr-8 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-secondary/40 focus:outline-none focus:ring-1 focus:ring-accent-signal",
        // Caret hint via background-image
        "bg-[length:9px_9px] bg-[position:right_0.5rem_center] bg-no-repeat",
        "bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%208%208%22%3E%3Cpath%20d=%22M1%202.5L4%205.5L7%202.5%22%20stroke=%22%23555%22%20stroke-width=%221%22%20fill=%22none%22/%3E%3C/svg%3E')]",
        className,
      )}
    >
      {children}
    </select>
  );
}

// ─── Editorial text input ──────────────────────────────────────────────────

type EditorialInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const EditorialInput = React.forwardRef<HTMLInputElement, EditorialInputProps>(
  function EditorialInput({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        {...rest}
        className={cn(
          "block w-full border border-input bg-card px-3 py-2.5 font-sans text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-1 focus:ring-accent-signal",
          className,
        )}
      />
    );
  },
);

// ─── Primary button (navy-filled, mono label) ──────────────────────────────

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export function PrimaryButton({
  className,
  fullWidth,
  children,
  ...rest
}: PrimaryButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 bg-primary px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
        fullWidth && "w-full",
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Risk level → editorial classes ────────────────────────────────────────

const RISK_TO_STATUS: Record<string, StatusKind> = {
  low: "valid",
  medium: "warn",
  moderate: "warn",
  high: "warn",
  very_high: "error",
};

export function riskStatus(riskLevel: string): StatusKind {
  return RISK_TO_STATUS[riskLevel] ?? "neutral";
}

export function riskLabel(riskLevel: string): string {
  return riskLevel.replace(/_/g, " ").toUpperCase();
}
