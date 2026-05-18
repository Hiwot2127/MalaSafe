// Shared editorial primitives.
// Vocabulary lives in app/globals.css - Fraunces display, Manrope sans, IBM Plex
// Mono eyebrows, warm card surfaces, sharp 0.25rem corners, status tints.
// /upload and /monthly-close are the design references.

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
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
        "rounded-[var(--radius)] border border-border bg-card shadow-sm",
        hover && "transition-all hover:shadow-md hover:border-primary/30",
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

// ─── Editorial select (Radix-backed, fully themed popover) ─────────────────
//
// Native <select> popovers can't be styled, so the chooser uses Radix Select
// for both the trigger and the option panel. Existing call sites pass an
// `options` array; the API is otherwise close to a controlled <select>.

export interface EditorialSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface EditorialSelectProps {
  value: string;
  onChange: (next: string) => void;
  options: ReadonlyArray<EditorialSelectOption>;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  // Width of the popup. By default Radix matches the trigger width which
  // is fine for short labels; pass `auto` to let the panel size to content.
  contentWidth?: "trigger" | "auto";
}

export function EditorialSelect({
  value,
  onChange,
  options = [],
  placeholder,
  className,
  disabled,
  contentWidth = "trigger",
  ...rest
}: EditorialSelectProps) {
  const ariaLabel = rest["aria-label"];
  // Radix uses empty string as the "no value" sentinel and forbids it for
  // <Item value="">, so we remap an empty value to a non-empty token at the
  // item level. The user-facing value stays as the original string.
  const EMPTY_TOKEN = "__editorial_empty__";
  const radixValue = value === "" ? EMPTY_TOKEN : value;

  return (
    <SelectPrimitive.Root
      value={radixValue}
      onValueChange={(next) => onChange(next === EMPTY_TOKEN ? "" : next)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 pr-2.5",
          "font-mono text-[11px] uppercase tracking-[0.18em] text-foreground",
          "transition-colors hover:bg-secondary/40",
          "focus:outline-none focus:ring-2 focus:ring-accent-signal/40",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          "[&>span]:line-clamp-1",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "relative z-50 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground",
            "shadow-[0_8px_20px_-6px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.10)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            contentWidth === "trigger" && "min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => {
              const itemValue = opt.value === "" ? EMPTY_TOKEN : opt.value;
              return (
                <SelectPrimitive.Item
                  key={itemValue}
                  value={itemValue}
                  disabled={opt.disabled}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center gap-2 px-2.5 py-1.5 pr-7",
                    "font-mono text-[11px] uppercase tracking-[0.18em] text-foreground",
                    "outline-none transition-colors",
                    "data-[highlighted]:bg-secondary/60 data-[highlighted]:text-foreground",
                    "data-[state=checked]:text-foreground",
                    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
                  )}
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex">
                    <Check aria-hidden className="size-3.5 text-accent-signal" strokeWidth={2} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
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
          "block w-full rounded-md border border-input bg-card px-3 py-2.5 font-sans text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-signal/40",
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
        "inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 font-sans text-sm font-medium tracking-tight text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow disabled:cursor-not-allowed disabled:opacity-50",
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
  high: "error",
  very_high: "error",
};

export function riskStatus(riskLevel: string): StatusKind {
  return RISK_TO_STATUS[riskLevel] ?? "neutral";
}

export function riskLabel(riskLevel: string): string {
  return riskLevel.replace(/_/g, " ").toUpperCase();
}

// ─── Re-exports for the domain primitives in sibling files ─────────────────

export { StatCard } from "./stat-card";
export { EmptyState } from "./empty-state";
export { LoadingScreen } from "./loading-screen";
export { AlertBanner } from "./alert-banner";
export { Avatar } from "./avatar";
export { NotificationBell } from "./notification-bell";
export { AlertCard } from "./alert-card";
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./accordion";
