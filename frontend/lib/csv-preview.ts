"use client";

import Papa from "papaparse";
import type { UploadError, UploadKind } from "@/types/upload";

/**
 * Client-side CSV pre-check. Runs in the browser the moment a file is picked
 * so the modal can open immediately with row counts + obvious-format issues,
 * without waiting for a round-trip to the backend dry-run endpoint.
 *
 * The backend dry-run is still the source of truth - it runs full district +
 * duplicate validation. This is a fast first read so the modal feels instant.
 */

export interface LocalPreviewRow {
  rowNumber: number; // CSV line number (header = 1, first data row = 2)
  data: Record<string, string>;
}

export interface LocalPreviewResult {
  totalRows: number;
  validRows: LocalPreviewRow[]; // rows that pass tier-1 checks (no DB lookup yet)
  invalidRows: UploadError[];
  fileErrors: UploadError[];
  distinctMonths: string[]; // ISO YYYY-MM, monthly uploads only
  predictedMode?: "close" | "backfill"; // monthly uploads only
  // Every parsed data row (header-normalized), valid or not. The EDA panel
  // computes quality/stats over the full set, not just the valid sample.
  allRows: Array<Record<string, string>>;
}

const REQUIRED_BY_KIND: Record<UploadKind, string[]> = {
  monthly: ["eth_month_year", "positive", "tests"],
  climate: ["district_code", "date", "rainfall", "temperature"],
};

// For monthly uploads, at least ONE identifier column is required
const MONTHLY_IDENTIFIER_OPTIONS = ["organisationunitid", "district_code"];

const SMALL_UPLOAD_MAX_MONTHS = 2;

function isFiniteNumber(v: string | undefined): boolean {
  if (v === undefined || v === "") return false;
  const n = Number(v);
  return Number.isFinite(n);
}

function inRange(v: string, min: number, max: number): boolean {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max;
}

export async function parseLocalPreview(
  file: File,
  kind: UploadKind,
): Promise<LocalPreviewResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      complete: (results) => {
        const rows = results.data;
        const required = REQUIRED_BY_KIND[kind];

        const fileErrors: UploadError[] = [];
        const invalidRows: UploadError[] = [];
        const validRows: LocalPreviewRow[] = [];
        const months = new Set<string>();

        // File-level check: headers present?
        const headers = results.meta.fields ?? [];
        const missing = required.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
          fileErrors.push({
            error: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
          });
        }
        
        // For monthly uploads, verify at least one identifier column exists
        if (kind === "monthly" && fileErrors.length === 0) {
          const hasIdentifier = MONTHLY_IDENTIFIER_OPTIONS.some(col => headers.includes(col));
          if (!hasIdentifier) {
            fileErrors.push({
              error: `Missing required identifier column: include organisationunitid or district_code`,
            });
          }
        }

        if (fileErrors.length === 0) {
          rows.forEach((row, idx) => {
            const rowNumber = idx + 2; // header is line 1
            const issues: UploadError[] = [];

            // Required value presence
            for (const col of required) {
              if (!row[col] || row[col] === "") {
                issues.push({
                  row: rowNumber,
                  column: col,
                  value: "empty",
                  error: "Required field cannot be empty",
                });
              }
            }
            
            // For monthly uploads, check that at least one identifier is present
            if (kind === "monthly") {
              const hasIdentifier = MONTHLY_IDENTIFIER_OPTIONS.some(col => 
                headers.includes(col) && row[col] && row[col] !== ""
              );
              if (!hasIdentifier) {
                issues.push({
                  row: rowNumber,
                  column: "identifier",
                  value: "empty",
                  error: "Row must have organisationunitid or district_code",
                });
              }
            }

            // Per-kind numeric ranges (best-effort, matches backend tier-1 rules).
            if (kind === "monthly") {
              if (row.positive && !isFiniteNumber(row.positive)) {
                issues.push({ row: rowNumber, column: "positive", value: row.positive, error: "Positive must be numeric" });
              }
              if (row.tests && !isFiniteNumber(row.tests)) {
                issues.push({ row: rowNumber, column: "tests", value: row.tests, error: "Tests must be numeric" });
              }
              if (row.travel && !isFiniteNumber(row.travel)) {
                issues.push({ row: rowNumber, column: "travel", value: row.travel, error: "Travel must be numeric" });
              }
              // We don't ship an Ethiopian-calendar helper to the frontend yet, so
              // use the raw `eth_month_year` cell as the distinct-month key. The
              // predicted_mode derivation only counts distinct months, so this is
              // sufficient even without Gregorian alignment.
              if (row.eth_month_year) {
                months.add(row.eth_month_year);
              }
            } else if (kind === "climate") {
              if (row.rainfall && Number(row.rainfall) < 0) {
                issues.push({ row: rowNumber, column: "rainfall", value: row.rainfall, error: "Rainfall must be >= 0" });
              }
              if (row.temperature && !inRange(row.temperature, -50, 60)) {
                issues.push({ row: rowNumber, column: "temperature", value: row.temperature, error: "Temperature must be -50..60" });
              }
              if (row.date && Number.isNaN(Date.parse(row.date))) {
                issues.push({ row: rowNumber, column: "date", value: row.date, error: "Invalid date format" });
              }
            }

            if (issues.length === 0) {
              validRows.push({ rowNumber, data: row });
            } else {
              for (const issue of issues) {
                invalidRows.push({ ...issue, row_data: row });
              }
            }
          });
        }

        const distinctMonths = Array.from(months).sort();
        const predictedMode = kind === "monthly"
          ? (distinctMonths.length <= SMALL_UPLOAD_MAX_MONTHS ? "close" : "backfill")
          : undefined;

        resolve({
          totalRows: rows.length,
          validRows,
          invalidRows,
          fileErrors,
          distinctMonths,
          predictedMode,
          allRows: rows,
        });
      },
      error: (err) => {
        resolve({
          totalRows: 0,
          validRows: [],
          invalidRows: [],
          fileErrors: [{ error: `Could not parse CSV: ${err.message}` }],
          distinctMonths: [],
          allRows: [],
        });
      },
    });
  });
}
