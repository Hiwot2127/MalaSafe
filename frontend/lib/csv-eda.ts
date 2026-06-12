/**
 * Client-side exploratory data analysis for monthly malaria uploads.
 *
 * Runs entirely in the browser over the parsed CSV rows (the same rows the
 * preview modal already has from `parseLocalPreview`). It mirrors a domain
 * EDA report: data-quality scoring, descriptive stats + distributions,
 * woreda-level geography, within-upload outlier detection, and model-readiness
 * checks with plain-language insights.
 *
 * What it deliberately does NOT do (needs DB data, deferred to a backend phase):
 *  - Region / Zone rollups (OrgUnitMapping only resolves to District/woreda)
 *  - "Missing reporting locations" (needs the authoritative woreda list)
 *  - Comparison against historical averages
 * Authoritative identifier resolution + duplicate-vs-DB checks already come
 * from the server `/preview` dry-run; this is the fast, file-only first read.
 */

// ─── Column model (real monthly-malaria schema) ─────────────────────────────
// identifier: organisationunitid OR district_code · eth_month_year · positive ·
// tests · travel (optional). Headers are lowercased/underscored upstream.

const NUMERIC_FIELDS = ["positive", "tests", "travel"] as const;
type NumericField = (typeof NUMERIC_FIELDS)[number];

const IDENTIFIER_FIELDS = ["organisationunitid", "district_code"] as const;

// ─── Public result shapes ───────────────────────────────────────────────────

export interface NumericSummary {
  field: string;
  count: number; // non-empty, numeric values
  missing: number; // empty/blank cells
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  std: number;
  sum: number;
}

export interface Histogram {
  field: string;
  bins: Array<{ label: string; from: number; to: number; count: number }>;
}

export interface QualityIssue {
  level: "error" | "warning";
  label: string;
  count: number;
  detail: string;
}

export interface DataQuality {
  score: number; // 0-100 composite
  totalRows: number;
  completeness: number; // % of required cells populated
  duplicateRows: number; // (identifier + month) collisions within the file
  typeErrors: number; // non-numeric values in numeric columns
  integrityViolations: number; // positive > tests, or negatives
  missingByColumn: Array<{ column: string; missing: number; pct: number }>;
  issues: QualityIssue[];
}

export interface GeoRow {
  location: string;
  cases: number;
  tests: number;
  positivity: number; // %
  rows: number;
}

export interface Geographic {
  identifierField: string; // which column identified the location
  distinctLocations: number;
  top: GeoRow[]; // highest-burden locations (sorted by cases desc)
  all: GeoRow[]; // heatmap-ready, full aggregation
}

export interface MonthRow {
  month: string;
  cases: number;
  tests: number;
  positivity: number; // %
}

export interface OutlierRow {
  location: string;
  month: string;
  positive: number;
  reason: string;
}

export interface Readiness {
  ready: boolean;
  checks: Array<{ label: string; ok: boolean; detail: string }>;
}

export interface MonthlyEda {
  rowsAnalyzed: number;
  quality: DataQuality;
  summaries: NumericSummary[]; // positive, tests, travel, positivity_rate
  histograms: Histogram[];
  byMonth: MonthRow[];
  geographic: Geographic;
  outliers: OutlierRow[];
  readiness: Readiness;
  insights: string[];
}

// ─── Stats helpers ──────────────────────────────────────────────────────────

function toNumber(v: string | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Linear-interpolated percentile (p in [0,1]) over a pre-sorted array. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function summarize(field: string, values: number[], missing: number): NumericSummary {
  if (values.length === 0) {
    return { field, count: 0, missing, min: 0, q1: 0, median: 0, q3: 0, max: 0, mean: 0, std: 0, sum: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return {
    field,
    count: values.length,
    missing,
    min: sorted[0],
    q1: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    q3: percentile(sorted, 0.75),
    max: sorted[sorted.length - 1],
    mean,
    std: Math.sqrt(variance),
    sum,
  };
}

function buildHistogram(field: string, values: number[], binCount = 10): Histogram {
  if (values.length === 0) return { field, bins: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { field, bins: [{ label: fmt(min), from: min, to: max, count: values.length }] };
  }
  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => {
    const from = min + i * width;
    const to = i === binCount - 1 ? max : from + width;
    return { label: `${fmt(from)}–${fmt(to)}`, from, to, count: 0 };
  });
  for (const v of values) {
    let i = Math.floor((v - min) / width);
    if (i >= binCount) i = binCount - 1;
    if (i < 0) i = 0;
    bins[i].count += 1;
  }
  return { field, bins };
}

function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(Math.abs(n) < 10 ? 1 : 0);
}

// ─── Field extraction ───────────────────────────────────────────────────────

function pickIdentifierField(rows: Array<Record<string, string>>): string {
  for (const f of IDENTIFIER_FIELDS) {
    if (rows.some((r) => r[f] && r[f] !== "")) return f;
  }
  return IDENTIFIER_FIELDS[0];
}

// ─── Main entry point ───────────────────────────────────────────────────────

export function computeMonthlyEda(rows: Array<Record<string, string>>): MonthlyEda {
  const total = rows.length;
  const identifierField = pickIdentifierField(rows);

  // --- Numeric series (collect values + missing counts) ---
  const series: Record<NumericField, number[]> = { positive: [], tests: [], travel: [] };
  const missingCount: Record<string, number> = {};
  const requiredCols = ["positive", "tests", "eth_month_year", identifierField];
  for (const c of requiredCols) missingCount[c] = 0;
  missingCount["travel"] = 0;

  let typeErrors = 0;
  let integrityViolations = 0;
  const positivityValues: number[] = [];
  const dupKeys = new Map<string, number>();

  for (const row of rows) {
    // missingness for tracked columns
    for (const c of Object.keys(missingCount)) {
      if (!row[c] || row[c] === "") missingCount[c] += 1;
    }

    // numeric parsing + type errors
    for (const f of NUMERIC_FIELDS) {
      const raw = row[f];
      if (raw === undefined || raw === "") continue; // missing handled above
      const n = toNumber(raw);
      if (n === null) {
        typeErrors += 1;
        continue;
      }
      series[f].push(n);
      if (n < 0) integrityViolations += 1;
    }

    // integrity: positive must not exceed tests; derived positivity
    const pos = toNumber(row.positive);
    const tst = toNumber(row.tests);
    if (pos !== null && tst !== null) {
      if (pos > tst) integrityViolations += 1;
      if (tst > 0) positivityValues.push((pos / tst) * 100);
    }

    // duplicate key within the file
    const id = row[identifierField] ?? "";
    const month = row.eth_month_year ?? "";
    if (id && month) {
      const key = `${id}__${month}`;
      dupKeys.set(key, (dupKeys.get(key) ?? 0) + 1);
    }
  }

  const duplicateRows = Array.from(dupKeys.values()).reduce((a, c) => a + (c > 1 ? c - 1 : 0), 0);

  // --- Section 1: data quality ---
  const missingByColumn = Object.entries(missingCount)
    .map(([column, missing]) => ({ column, missing, pct: total ? (missing / total) * 100 : 0 }))
    .sort((a, b) => b.missing - a.missing);

  const requiredCells = total * requiredCols.length;
  const missingRequired = requiredCols.reduce((a, c) => a + (missingCount[c] ?? 0), 0);
  const completeness = requiredCells ? ((requiredCells - missingRequired) / requiredCells) * 100 : 100;

  const issues: QualityIssue[] = [];
  if (missingRequired > 0)
    issues.push({ level: "warning", label: "Missing required values", count: missingRequired, detail: "Empty cells in required columns will be skipped on import." });
  if (duplicateRows > 0)
    issues.push({ level: "warning", label: "Duplicate rows in file", count: duplicateRows, detail: `Same ${identifierField} + month appears more than once.` });
  if (typeErrors > 0)
    issues.push({ level: "error", label: "Non-numeric values", count: typeErrors, detail: "Positive / tests / travel cells that aren't numbers." });
  if (integrityViolations > 0)
    issues.push({ level: "error", label: "Integrity violations", count: integrityViolations, detail: "Positive exceeds tests, or a negative value." });

  // Composite score: weighted penalties off 100.
  const pct = (n: number) => (total ? n / total : 0);
  const score = Math.max(
    0,
    Math.round(
      100 -
        pct(missingRequired) * 25 -
        pct(duplicateRows) * 20 -
        pct(typeErrors) * 30 -
        pct(integrityViolations) * 35,
    ),
  );

  const quality: DataQuality = {
    score,
    totalRows: total,
    completeness,
    duplicateRows,
    typeErrors,
    integrityViolations,
    missingByColumn,
    issues,
  };

  // --- Section 2: descriptive stats + distributions ---
  const summaries: NumericSummary[] = [
    summarize("positive", series.positive, missingCount["positive"] ?? 0),
    summarize("tests", series.tests, missingCount["tests"] ?? 0),
    summarize("travel", series.travel, missingCount["travel"] ?? 0),
    summarize("positivity_rate", positivityValues, 0),
  ];
  const histograms: Histogram[] = [
    buildHistogram("positive", series.positive),
    buildHistogram("tests", series.tests),
    buildHistogram("positivity_rate", positivityValues),
  ];

  // --- by-month time series (cases & positivity) ---
  const monthAgg = new Map<string, { cases: number; tests: number }>();
  for (const row of rows) {
    const month = row.eth_month_year;
    if (!month) continue;
    const pos = toNumber(row.positive) ?? 0;
    const tst = toNumber(row.tests) ?? 0;
    const cur = monthAgg.get(month) ?? { cases: 0, tests: 0 };
    cur.cases += pos;
    cur.tests += tst;
    monthAgg.set(month, cur);
  }
  const byMonth: MonthRow[] = Array.from(monthAgg.entries())
    .map(([month, v]) => ({ month, cases: v.cases, tests: v.tests, positivity: v.tests > 0 ? (v.cases / v.tests) * 100 : 0 }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // --- Section 3: geographic (woreda/district level) ---
  const geoAgg = new Map<string, { cases: number; tests: number; rows: number }>();
  for (const row of rows) {
    const loc = row[identifierField];
    if (!loc) continue;
    const pos = toNumber(row.positive) ?? 0;
    const tst = toNumber(row.tests) ?? 0;
    const cur = geoAgg.get(loc) ?? { cases: 0, tests: 0, rows: 0 };
    cur.cases += pos;
    cur.tests += tst;
    cur.rows += 1;
    geoAgg.set(loc, cur);
  }
  const geoAll: GeoRow[] = Array.from(geoAgg.entries())
    .map(([location, v]) => ({ location, cases: v.cases, tests: v.tests, positivity: v.tests > 0 ? (v.cases / v.tests) * 100 : 0, rows: v.rows }))
    .sort((a, b) => b.cases - a.cases);
  const geographic: Geographic = {
    identifierField,
    distinctLocations: geoAll.length,
    top: geoAll.slice(0, 10),
    all: geoAll,
  };

  // --- Section 4: outliers (IQR fence on per-row positive) ---
  const outliers = detectOutliers(rows, identifierField);

  // --- Section 5: readiness checks ---
  const idMissing = missingCount[identifierField] ?? 0;
  const monthMissing = missingCount["eth_month_year"] ?? 0;
  const numericComplete = (missingCount["positive"] ?? 0) === 0 && (missingCount["tests"] ?? 0) === 0;
  const checks = [
    { label: "Location identifier present", ok: idMissing === 0, detail: idMissing === 0 ? `Every row has ${identifierField}.` : `${idMissing} row(s) missing ${identifierField}.` },
    { label: "Reporting month present", ok: monthMissing === 0, detail: monthMissing === 0 ? "Every row has eth_month_year." : `${monthMissing} row(s) missing the month.` },
    { label: "Model features populated", ok: numericComplete, detail: numericComplete ? "Positive & tests present for prediction features." : "Some rows lack positive/tests." },
    { label: "No integrity violations", ok: integrityViolations === 0, detail: integrityViolations === 0 ? "Positive ≤ tests, no negatives." : `${integrityViolations} violating row(s).` },
  ];
  const readiness: Readiness = { ready: checks.every((c) => c.ok), checks };

  // --- insights (plain language) ---
  const insights = buildInsights({ total, byMonth, geographic, summaries, outliers, quality });

  return {
    rowsAnalyzed: total,
    quality,
    summaries,
    histograms,
    byMonth,
    geographic,
    outliers,
    readiness,
    insights,
  };
}

function detectOutliers(rows: Array<Record<string, string>>, identifierField: string): OutlierRow[] {
  const values = rows.map((r) => toNumber(r.positive)).filter((n): n is number => n !== null);
  if (values.length < 4) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const upper = q3 + 1.5 * iqr;
  const lower = q1 - 1.5 * iqr;
  const out: OutlierRow[] = [];
  for (const row of rows) {
    const pos = toNumber(row.positive);
    if (pos === null) continue;
    if (pos > upper || pos < lower) {
      out.push({
        location: row[identifierField] ?? "—",
        month: row.eth_month_year ?? "—",
        positive: pos,
        reason: pos > upper ? `Above upper fence (${fmt(upper)})` : `Below lower fence (${fmt(lower)})`,
      });
    }
  }
  return out.sort((a, b) => b.positive - a.positive).slice(0, 25);
}

function buildInsights(args: {
  total: number;
  byMonth: MonthRow[];
  geographic: Geographic;
  summaries: NumericSummary[];
  outliers: OutlierRow[];
  quality: DataQuality;
}): string[] {
  const { total, byMonth, geographic, summaries, outliers, quality } = args;
  const out: string[] = [];
  const positivity = summaries.find((s) => s.field === "positivity_rate");

  out.push(`${total.toLocaleString()} rows across ${geographic.distinctLocations} reporting location(s) and ${byMonth.length} month(s).`);
  if (geographic.top[0]) {
    out.push(`Highest burden: ${geographic.top[0].location} with ${geographic.top[0].cases.toLocaleString()} cases.`);
  }
  if (positivity && positivity.count > 0) {
    out.push(`Mean test positivity is ${positivity.mean.toFixed(1)}% (median ${positivity.median.toFixed(1)}%).`);
  }
  if (byMonth.length >= 2) {
    const first = byMonth[0];
    const last = byMonth[byMonth.length - 1];
    const dir = last.cases >= first.cases ? "rose" : "fell";
    out.push(`Cases ${dir} from ${first.cases.toLocaleString()} (${first.month}) to ${last.cases.toLocaleString()} (${last.month}).`);
  }
  if (outliers.length > 0) {
    out.push(`${outliers.length} row(s) flagged as statistical outliers in case counts (IQR method).`);
  }
  out.push(
    quality.score >= 90
      ? `Data quality looks strong (${quality.score}/100).`
      : quality.score >= 70
        ? `Data quality is acceptable (${quality.score}/100); review the flagged issues.`
        : `Data quality is low (${quality.score}/100); resolve errors before relying on predictions.`,
  );
  return out;
}
