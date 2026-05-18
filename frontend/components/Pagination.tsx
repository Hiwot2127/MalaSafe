"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageCount } from "@/lib/url-state";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (next: number) => void;
  className?: string;
  // Optional label for the row range (e.g. "rows", "districts").
  unit?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
  className,
  unit = "rows",
}: PaginationProps) {
  const pages = pageCount(total, pageSize);
  const safePage = Math.min(Math.max(1, page), pages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);
  const prevDisabled = safePage <= 1;
  const nextDisabled = safePage >= pages;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3",
        className,
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
        {total === 0
          ? `0 ${unit}`
          : `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()} ${unit}`}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={prevDisabled}
          onClick={() => onChange(safePage - 1)}
          aria-label="Previous page"
          className={cn(
            "inline-flex items-center gap-1 border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-secondary/40",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card",
          )}
        >
          <ChevronLeft aria-hidden className="size-3.5" strokeWidth={1.5} />
          Prev
        </button>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
          page {safePage} / {pages}
        </span>
        <button
          type="button"
          disabled={nextDisabled}
          onClick={() => onChange(safePage + 1)}
          aria-label="Next page"
          className={cn(
            "inline-flex items-center gap-1 border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-secondary/40",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card",
          )}
        >
          Next
          <ChevronRight aria-hidden className="size-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
