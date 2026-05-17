export interface UploadError {
  row?: number;
  column?: string;
  value?: string;
  error: string;
  // Original row payload, populated by the preview endpoint so the modal can
  // show what was in the bad row, not just "row 5: deaths > cases".
  row_data?: Record<string, string | number | null>;
}

export interface StageResult {
  name: string; // 'parse' | 'validate' | 'insert' | 'dispatch_close'
  status: string; // 'ok' | 'skipped' | 'failed'
  count?: number | null;
  duration_ms?: number | null;
  detail?: string | null;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  records_processed: number;
  records_created: number;
  records_skipped: number;
  errors: UploadError[];
  file_id?: string | null;
  // Set when a monthly upload dispatches the closing pipeline.
  monthly_close_id?: string | null;
  // 'close' (<=2 distinct months) or 'backfill' (>2 distinct months).
  monthly_close_mode?: string | null;
  // Pipeline timeline; frontend renders as a vertical stepper.
  stages: StageResult[];
}

export interface UploadPreviewSummary {
  total_rows: number;
  valid_rows: number;
  skipped_rows: number;
  duplicate_rows: number;
  distinct_months: string[];
  predicted_mode?: string | null;
}

export interface UploadPreviewRow {
  row_number: number;
  data: Record<string, string | number | null>;
}

export interface UploadPreviewResponse {
  summary: UploadPreviewSummary;
  valid_sample: UploadPreviewRow[];
  invalid_rows: UploadError[];
  duplicate_rows: UploadError[];
  file_errors: UploadError[];
}

export interface UploadedFile {
  id: string;
  file_name: string;
  upload_type: "weekly_malaria" | "monthly_malaria" | "climate";
  uploaded_by: string;
  created_at: string;
  records_processed?: number;
  row_count?: number;
  month_span?: number;
}

export type UploadKind = "weekly" | "monthly" | "climate";
