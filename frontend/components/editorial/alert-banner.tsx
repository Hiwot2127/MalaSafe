import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "valid" | "warn" | "error";

const TONE_STYLES: Record<Tone, { wrap: string; icon: string; Component: React.ComponentType<{ className?: string; strokeWidth?: number }> }> = {
  info: {
    wrap: "border-accent-signal/30 bg-accent-signal-tint text-foreground",
    icon: "text-accent-signal",
    Component: Info,
  },
  valid: {
    wrap: "border-status-valid/30 bg-status-valid-tint text-foreground",
    icon: "status-valid",
    Component: CheckCircle2,
  },
  warn: {
    wrap: "border-status-warn/30 bg-status-warn-tint text-foreground",
    icon: "status-warn",
    Component: AlertTriangle,
  },
  error: {
    wrap: "border-status-error/30 bg-status-error-tint text-foreground",
    icon: "status-error",
    Component: XCircle,
  },
};

interface AlertBannerProps {
  tone?: Tone;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** When provided, renders a dismiss button calling this handler. */
  onDismiss?: () => void;
  className?: string;
}

export function AlertBanner({
  tone = "info",
  title,
  description,
  action,
  onDismiss,
  className,
}: AlertBannerProps) {
  const { wrap, icon, Component: Icon } = TONE_STYLES[tone];
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3 shadow-sm",
        wrap,
        className,
      )}
    >
      <Icon className={cn("size-4 shrink-0 mt-0.5", icon)} strokeWidth={1.75} aria-hidden />
      <div className="flex-1 space-y-1">
        <p className="font-sans text-sm font-medium leading-tight text-foreground">{title}</p>
        {description ? (
          <div className="font-sans text-sm leading-relaxed text-muted-foreground">{description}</div>
        ) : null}
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <X className="size-3.5" strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
