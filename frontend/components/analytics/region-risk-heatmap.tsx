"use client";

import { RISK_HSL } from "@/components/charts/chart-frame";
import { levelLabel, type RiskMatrix } from "@/lib/analytics-derive";

/**
 * Region × risk-level matrix as a colored grid (Recharts has no native
 * heatmap). Rows are regions ordered by total district count; columns are the
 * four canonical risk buckets. Each cell's tint comes from the risk ramp and
 * its opacity scales with the district count relative to the busiest cell, so
 * concentration is readable at a glance. Cells carry `title` text because color
 * alone isn't accessible.
 */
export function RegionRiskHeatmap({ matrix }: { matrix: RiskMatrix }) {
  const { regions, levels, counts, max } = matrix;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[34rem]">
        {/* header row */}
        <div className="grid grid-cols-[minmax(7rem,1.2fr)_repeat(4,1fr)] gap-px">
          <div aria-hidden />
          {levels.map((level) => (
            <div
              key={level}
              className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              {levelLabel(level)}
            </div>
          ))}
        </div>

        {/* data rows */}
        <div className="flex flex-col gap-px bg-border/40">
          {regions.map((region) => (
            <div
              key={region}
              className="grid grid-cols-[minmax(7rem,1.2fr)_repeat(4,1fr)] gap-px"
            >
              <div className="flex items-center bg-card/60 px-3 py-2 font-sans text-xs text-foreground">
                <span className="truncate" title={region}>
                  {region}
                </span>
              </div>
              {levels.map((level) => {
                const count = counts[region][level];
                const intensity = max === 0 ? 0 : count / max;
                // Floor the alpha so a non-zero cell is always visible; empty
                // cells stay at the neutral card surface.
                const alpha = count === 0 ? 0 : 0.15 + intensity * 0.75;
                return (
                  <div
                    key={level}
                    title={`${region} · ${levelLabel(level)}: ${count} district${count === 1 ? "" : "s"}`}
                    className="flex items-center justify-center px-2 py-2 font-mono text-xs tabular-nums"
                    style={{
                      background:
                        count === 0
                          ? "var(--color-card)"
                          : `hsl(${RISK_HSL[level]} / ${alpha})`,
                      color: alpha > 0.55 ? "var(--color-background)" : "var(--color-foreground)",
                    }}
                  >
                    {count === 0 ? (
                      <span className="text-muted-foreground/40">·</span>
                    ) : (
                      count
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* legend */}
        <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Fewer</span>
          <span className="flex h-2.5 w-28 overflow-hidden rounded-sm">
            {[0.2, 0.4, 0.6, 0.8, 1].map((a) => (
              <span
                key={a}
                className="flex-1"
                style={{ background: `hsl(${RISK_HSL.high} / ${a})` }}
              />
            ))}
          </span>
          <span>More districts</span>
        </div>
      </div>
    </div>
  );
}
