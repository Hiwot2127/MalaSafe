/**
 * Pure, framework-free derivation helpers for the analytics page.
 *
 * The page fetches three things (trends, dashboard/by-region, risk-map) and
 * shapes them into the series each chart needs. Keeping the math here — with no
 * React — makes every transform trivially unit-testable and lets the chart
 * components stay presentational (props in, SVG out).
 */

import type { TrendDataPoint, RegionStat } from "@/types/analytics";
import type { RiskFeature, RiskLevel } from "@/types/map";
import type { EditorialSelectOption } from "@/components/editorial";

/** The four canonical risk buckets, low → high, used as heatmap columns and
 *  the donut/legend order. `medium` is a synonym the model sometimes emits and
 *  is folded into `moderate` via {@link normalizeLevel}. */
export const LEVEL_ORDER = ["low", "moderate", "high", "very_high"] as const;
export type CanonicalLevel = (typeof LEVEL_ORDER)[number];

const LEVEL_LABELS: Record<CanonicalLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  very_high: "Very high",
};

export function levelLabel(level: CanonicalLevel): string {
  return LEVEL_LABELS[level];
}

/** Collapse the `medium`/`moderate` synonym pair into one canonical bucket. */
export function normalizeLevel(level: RiskLevel | string): CanonicalLevel {
  if (level === "medium") return "moderate";
  if (level === "low" || level === "moderate" || level === "high" || level === "very_high") {
    return level;
  }
  return "low";
}

// ─── Trend series ───────────────────────────────────────────────────────────

export interface TrendPointDerived extends TrendDataPoint {
  /** Trailing simple moving average of `positive`; null until `window` points
   *  have accumulated so the line simply starts later instead of lying. */
  movingAvg: number | null;
  /** Period-over-period change in `positive` (0 for the first point). */
  change: number;
  /** Percent change vs the previous period; null when undefined (first point
   *  or previous value 0). */
  changePct: number | null;
}

/**
 * Turn the raw trends payload into a chart-ready chronological series.
 * The API returns newest-first, so we reverse to oldest→newest, then attach a
 * trailing moving average and period-over-period change to each point.
 */
export function prepareTrendSeries(
  raw: TrendDataPoint[],
  window = 3,
): TrendPointDerived[] {
  const chrono = raw.slice().reverse();
  return chrono.map((point, i) => {
    let movingAvg: number | null = null;
    if (i >= window - 1) {
      let sum = 0;
      for (let j = i - window + 1; j <= i; j++) sum += chrono[j].positive;
      movingAvg = Math.round(sum / window);
    }
    const prev = i > 0 ? chrono[i - 1].positive : null;
    const change = prev === null ? 0 : point.positive - prev;
    const changePct = prev === null || prev === 0 ? null : (change / prev) * 100;
    return { ...point, movingAvg, change, changePct };
  });
}

// ─── Region × risk heatmap ──────────────────────────────────────────────────

export interface RiskMatrix {
  regions: string[];
  levels: readonly CanonicalLevel[];
  /** counts[region][level] = number of districts in that cell. */
  counts: Record<string, Record<CanonicalLevel, number>>;
  /** Row totals, used to sort regions by overall burden. */
  rowTotals: Record<string, number>;
  /** Largest single cell value, for color-intensity scaling (0 when empty). */
  max: number;
}

/**
 * Aggregate per-district risk features into a region × risk-bucket count
 * matrix. Regions are ordered by descending total district count so the
 * busiest regions sit at the top of the heatmap.
 */
export function buildRegionRiskMatrix(features: RiskFeature[]): RiskMatrix {
  const counts: Record<string, Record<CanonicalLevel, number>> = {};
  const rowTotals: Record<string, number> = {};

  for (const f of features) {
    const region = f.properties.region || "Unknown";
    const level = normalizeLevel(f.properties.risk_level);
    if (!counts[region]) {
      counts[region] = { low: 0, moderate: 0, high: 0, very_high: 0 };
      rowTotals[region] = 0;
    }
    counts[region][level] += 1;
    rowTotals[region] += 1;
  }

  const regions = Object.keys(counts).sort((a, b) => rowTotals[b] - rowTotals[a]);

  let max = 0;
  for (const region of regions) {
    for (const level of LEVEL_ORDER) {
      if (counts[region][level] > max) max = counts[region][level];
    }
  }

  return { regions, levels: LEVEL_ORDER, counts, rowTotals, max };
}

// ─── Risk distribution (donut) ──────────────────────────────────────────────

export interface RiskSlice {
  level: CanonicalLevel;
  label: string;
  count: number;
}

/** Count districts per canonical risk bucket, low→very_high, dropping empty
 *  buckets so the donut has no zero-width slices. */
export function riskDistribution(features: RiskFeature[]): RiskSlice[] {
  const tally: Record<CanonicalLevel, number> = {
    low: 0,
    moderate: 0,
    high: 0,
    very_high: 0,
  };
  for (const f of features) tally[normalizeLevel(f.properties.risk_level)] += 1;
  return LEVEL_ORDER.filter((level) => tally[level] > 0).map((level) => ({
    level,
    label: levelLabel(level),
    count: tally[level],
  }));
}

// ─── Top districts ──────────────────────────────────────────────────────────

export interface TopDistrict {
  name: string;
  region: string;
  recent_positive: number;
  level: CanonicalLevel;
}

/** The n districts with the most recently-observed positive cases, descending. */
export function topN(features: RiskFeature[], n = 10): TopDistrict[] {
  return features
    .map((f) => ({
      name: f.properties.district_name,
      region: f.properties.region,
      recent_positive: f.properties.recent_positive ?? 0,
      level: normalizeLevel(f.properties.risk_level),
    }))
    .filter((d) => d.recent_positive > 0)
    .sort((a, b) => b.recent_positive - a.recent_positive)
    .slice(0, n);
}

// ─── Confidence scatter ─────────────────────────────────────────────────────

export interface ScatterPoint {
  /** prediction_score (model output) */
  x: number;
  /** confidence_score (0–1) */
  y: number;
  level: CanonicalLevel;
  name: string;
}

/** Map features to (prediction_score, confidence_score) points, dropping any
 *  feature missing both scores so the scatter doesn't pile dots at the origin. */
export function scatterPoints(features: RiskFeature[]): ScatterPoint[] {
  return features
    .filter(
      (f) =>
        f.properties.prediction_score != null || f.properties.confidence_score != null,
    )
    .map((f) => ({
      x: f.properties.prediction_score ?? 0,
      y: f.properties.confidence_score ?? 0,
      level: normalizeLevel(f.properties.risk_level),
      name: f.properties.district_name,
    }));
}

// ─── Region selector options ────────────────────────────────────────────────

/** Build the region dropdown: an "All regions" sentinel (empty value) followed
 *  by the alphabetically-sorted region names from the unfiltered by-region set. */
export function regionOptions(byRegion: RegionStat[]): EditorialSelectOption[] {
  const names = Array.from(new Set(byRegion.map((r) => r.region)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  return [
    { value: "", label: "All regions" },
    ...names.map((name) => ({ value: name, label: name })),
  ];
}
