export interface RiskThresholds {
  /** low <= p50 < moderate */
  p50: number;
  /** moderate <= p75 < high */
  p75: number;
  /** high <= p95 < very_high */
  p95: number;
  notes?: string;
}

export interface DashboardSummary {
  total_positive: number;
  active_alerts: number;
  high_risk_districts: number;
  period: string;
  /** Human-readable form of `period` (e.g. "January 2024"). Server-supplied so
   *  the UI doesn't have to parse "YYYY-MM" itself. */
  period_label?: string;
  /** Rolling window the high-risk-district count uses, in days. */
  prediction_window_days?: number;
  /** Per-KPI plain-English definitions so the UI can render a tooltip without
   *  hard-coding the methodology. */
  methodology?: Record<string, string>;
  /** Global percentile cutoffs that drive the risk-bucket classification.
   *  Per-district thresholds override these server-side but the global set is
   *  what the dashboard shows as the user-visible reference. */
  risk_thresholds?: RiskThresholds | null;
  /** Trained LightGBM artifact version (from `model_card.json`). */
  model_version?: string | null;
  /** Thresholds package version (from `risk_thresholds.json` _meta.version).
   *  Diverges from `model_version` if the thresholds file was hand-edited
   *  separately from the model retrain. */
  thresholds_version?: string | null;
}

export interface TrendDataPoint {
  period: string;
  positive: number;
  week?: number;
  month?: number;
  year: number;
}

export interface TrendsResponse {
  period_type: 'weekly' | 'monthly';
  data: TrendDataPoint[];
  total_periods: number;
}

/** Per-region rollup returned by `/analytics/dashboard` in `by_region`. The
 *  backend only populates this when NO `region` filter is set (it returns `[]`
 *  for a single-region query), so the UI keeps an unfiltered snapshot to drive
 *  the region selector and the by-region charts. */
export interface RegionStat {
  region: string;
  total_positive: number;
  districts_count: number;
  high_risk_count: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  by_region: RegionStat[];
  recent_trends: TrendDataPoint[];
}
