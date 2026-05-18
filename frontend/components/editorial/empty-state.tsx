import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorialCard } from "./index";

interface EmptyStateProps {
  /** Lucide icon component. Rendered large + muted at the top. */
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, eyebrow, title, description, action, className }: EmptyStateProps) {
  return (
    <EditorialCard
      className={cn("flex flex-col items-center justify-center gap-3 px-8 py-12 text-center", className)}
    >
      {Icon ? (
        <span className="mb-1 inline-flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <Icon className="size-6" strokeWidth={1.5} />
        </span>
      ) : null}
      {eyebrow ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h3 className="font-display text-lg font-semibold leading-tight tracking-[-0.014em] text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="max-w-prose font-sans text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </EditorialCard>
  );
}
