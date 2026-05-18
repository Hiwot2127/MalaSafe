import * as React from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
};

interface AvatarProps {
  /** Used to derive initials when no image is provided. */
  name?: string | null;
  /** Optional image src. Falls back to initials when omitted. */
  src?: string | null;
  size?: Size;
  className?: string;
  /** Alternative text for the image / aria label for the initials. */
  alt?: string;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function Avatar({ name, src, size = "md", className, alt }: AvatarProps) {
  const label = alt ?? name ?? "User";
  const sizeClass = SIZE_CLASS[size];

  if (src) {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-border bg-secondary",
          sizeClass,
          className,
        )}
      >
        {/* Plain <img> avoids next/image config for external sources. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="size-full object-cover" />
      </span>
    );
  }

  return (
    <span
      aria-label={label}
      role="img"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary/10 font-mono font-semibold uppercase tracking-wide text-primary ring-1 ring-primary/20",
        sizeClass,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
