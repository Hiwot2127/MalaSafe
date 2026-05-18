"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  /** Number of unread / active items. `null` while loading. */
  count?: number | null;
  /** Where the bell deep-links. */
  href?: string;
  className?: string;
  ariaLabel?: string;
}

export function NotificationBell({
  count = null,
  href = "/alerts",
  className,
  ariaLabel,
}: NotificationBellProps) {
  const hasUnread = typeof count === "number" && count > 0;
  const display = !hasUnread ? null : count > 99 ? "99+" : String(count);

  return (
    <Link
      href={href}
      aria-label={ariaLabel ?? (hasUnread ? `${count} active alerts` : "Alerts")}
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-secondary",
        className,
      )}
    >
      <Bell className="size-4" strokeWidth={1.75} aria-hidden />
      {display ? (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-status-error px-1 font-mono text-[9px] font-semibold leading-none text-white tabular-nums ring-2 ring-background"
        >
          {display}
        </span>
      ) : null}
    </Link>
  );
}
