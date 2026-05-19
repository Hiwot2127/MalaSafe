import * as React from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo";

interface LoadingScreenProps {
  /** Optional eyebrow above the logo (default: "LOADING"). */
  eyebrow?: string;
  /** Optional short caption under the eyebrow. */
  caption?: string;
  /** When false the screen fills its container instead of the viewport. */
  fullViewport?: boolean;
  className?: string;
}

export function LoadingScreen({
  eyebrow = "Loading",
  caption,
  fullViewport = false,
  className,
}: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-4 bg-background text-foreground",
        fullViewport ? "fixed inset-0 z-50" : "h-full min-h-[20rem] w-full",
        className,
      )}
    >
      <span className="animate-pulse">
        <LogoMark size={48} />
      </span>
      <div className="flex flex-col items-center gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        {caption ? (
          <p className="font-sans text-sm text-muted-foreground">{caption}</p>
        ) : null}
      </div>
    </div>
  );
}
