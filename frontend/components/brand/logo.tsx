import { cn } from "@/lib/utils";

// MalaSafe brand mark.
// Concept: a navy square containing a geometric "M" letterform whose twin peaks
// double-read as Ethiopian highlands - the operational range of the surveillance
// system. Sharp 0.25rem-aligned corners match the editorial vocabulary. The mark
// is monochrome on purpose so it composes with the section tone strips and chart
// palette without competing for attention.

interface LogoMarkProps {
  size?: number;
  className?: string;
  /**
   * "solid"   - navy filled square + cream mark. Use on light surfaces.
   * "outline" - transparent frame + currentColor mark. Use on dark surfaces
   *             (inherits the parent's text color, so wrap in text-* utility).
   */
  variant?: "solid" | "outline";
  title?: string;
}

export function LogoMark({
  size = 32,
  className,
  variant = "solid",
  title = "MalaSafe",
}: LogoMarkProps) {
  const isOutline = variant === "outline";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {isOutline ? (
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ) : (
        <rect width="32" height="32" rx="1.5" fill="hsl(220 38% 22%)" />
      )}
      <path
        d="M7 23.5 L7 9 L16 17.5 L25 9 L25 23.5"
        stroke={isOutline ? "currentColor" : "hsl(40 32% 98%)"}
        strokeWidth="2.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

interface LogoWordmarkProps {
  className?: string;
  variant?: "solid" | "outline";
  caption?: string;
  size?: number;
}

export function LogoWordmark({
  className,
  variant = "solid",
  caption = "Surveillance · 01",
  size = 28,
}: LogoWordmarkProps) {
  const inverse = variant === "outline";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={size} variant={variant} />
      <div className="flex flex-col gap-0.5 leading-none">
        <span
          className={cn(
            "font-display text-base font-semibold tracking-[-0.018em]",
            inverse ? "text-primary-foreground" : "text-foreground",
          )}
        >
          MalaSafe
        </span>
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-[0.22em]",
            inverse ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        >
          {caption}
        </span>
      </div>
    </div>
  );
}
