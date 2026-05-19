import Image from "next/image";
import { cn } from "@/lib/utils";

// MalaSafe brand mark - shield + Anopheles silhouette + map pin, expressing
// the system's three dimensions: protection (shield), the pathogen vector
// (mosquito), and geographic surveillance (pin). Lives as a single raster in
// /public/logo.png so the artwork stays pixel-faithful at brand surfaces.

interface LogoMarkProps {
  size?: number;
  className?: string;
  /**
   * "solid"   - render the raster as-is. Use on light or branded surfaces.
   * "outline" - render the raster inside a tinted ring container. Use when
   *             surrounding text uses primary-foreground (dark panels).
   */
  variant?: "solid" | "outline";
  title?: string;
  /** Forward to next/image for above-the-fold logos (e.g. sidebar header). */
  priority?: boolean;
}

export function LogoMark({
  size = 32,
  className,
  variant = "solid",
  title = "MalaSafe",
  priority = false,
}: LogoMarkProps) {
  const isOutline = variant === "outline";
  return (
    <span
      aria-label={title}
      role="img"
      className={cn(
        "inline-flex items-center justify-center",
        isOutline && "rounded-md p-1.5 ring-1 ring-primary-foreground/30 bg-primary-foreground/5",
        className,
      )}
      style={{ width: isOutline ? size + 12 : size, height: isOutline ? size + 12 : size }}
    >
      <Image
        src="/logo.png"
        alt={title}
        width={size}
        height={size}
        priority={priority}
        className="select-none"
      />
    </span>
  );
}

interface LogoWordmarkProps {
  className?: string;
  variant?: "solid" | "outline";
  caption?: string;
  size?: number;
  priority?: boolean;
}

export function LogoWordmark({
  className,
  variant = "solid",
  caption = "Surveillance · 01",
  size = 32,
  priority = false,
}: LogoWordmarkProps) {
  const inverse = variant === "outline";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={size} variant={variant} priority={priority} />
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
