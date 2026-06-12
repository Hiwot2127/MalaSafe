"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";

import type { CanonicalLevel } from "@/lib/analytics-derive";

/**
 * Shared Recharts scaffolding for the analytics charts. Mirrors the local
 * helpers in components/upload/upload-eda-panel.tsx so both surfaces share one
 * visual language (theme-driven colors, the same tooltip chrome, a fixed-height
 * responsive wrapper). The upload panel keeps its own copy to avoid coupling;
 * new analytics charts import from here.
 */

// Theme-driven colors (resolve against app/globals.css `@theme` vars).
export const AXIS = "var(--color-muted-foreground)";
export const GRID = "var(--color-border)";

/** Categorical series palette (indigo, cyan, rose, amber, emerald). */
export const CHART = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const;

/** Low→high risk ramp (green → red), resolved colors. */
export const RISK = [
  "var(--color-risk-1)",
  "var(--color-risk-2)",
  "var(--color-risk-3)",
  "var(--color-risk-4)",
  "var(--color-risk-5)",
] as const;

const RISK_COLOR: Record<CanonicalLevel, string> = {
  low: "var(--color-risk-1)",
  moderate: "var(--color-risk-3)",
  high: "var(--color-risk-4)",
  very_high: "var(--color-risk-5)",
};

/** Resolved fill for a canonical risk level — green (low) → red (very high). */
export function riskColor(level: CanonicalLevel): string {
  return RISK_COLOR[level];
}

/** Raw HSL triplet vars, for building intensity ramps with an alpha channel
 *  (e.g. `hsl(var(--risk-4) / 0.5)` in the heatmap). */
export const RISK_HSL: Record<CanonicalLevel, string> = {
  low: "var(--risk-1)",
  moderate: "var(--risk-3)",
  high: "var(--risk-4)",
  very_high: "var(--risk-5)",
};

/** Fixed-height responsive wrapper. Recharts needs an explicit pixel height;
 *  width fluidly fills the grid cell. */
export function ChartFrame({
  height,
  label,
  children,
}: {
  height: number;
  /** Accessible name for the chart region (color alone isn't accessible). */
  label?: string;
  children: React.ReactElement;
}) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/** Shared tooltip chrome — card surface, mono font, hairline border. */
export const tooltipProps = {
  cursor: { fill: "var(--color-muted)", opacity: 0.4 },
  contentStyle: {
    background: "var(--color-popover, var(--color-card))",
    border: "1px solid var(--color-border)",
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "var(--font-mono, monospace)",
  },
  labelStyle: { color: "var(--color-foreground)" },
} as const;
