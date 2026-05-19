import { apiClient } from "./client";

export type MonthlyCloseStatus =
  | "pending"
  | "climate_fetching"
  | "backtesting"
  | "drift_checking"
  | "predicting"
  | "completed"
  | "failed";

export interface MonthlyCloseDetail {
  id: string;
  month: string;
  uploaded_file_id: string | null;
  triggered_by_user_id: string | null;
  mode: "close" | "backfill";
  status: MonthlyCloseStatus;
  idempotency_key: string;
  created_at: string;
  completed_at: string | null;
  error: string | null;
  // Free-form payload: each pipeline stage writes its own report shape.
  stats_json: Record<string, unknown> | null;
}

export interface BacktestRow {
  id: string;
  monthly_close_id: string;
  model_version_id: string | null;
  district_id: string;
  month: string;
  actual_cases: number;
  predicted_cases: number | null;
  predicted_risk: string | null;
  q10: number | null;
  q90: number | null;
  abs_error: number | null;
  pct_error: number | null;
  within_q10_q90: boolean | null;
  created_at: string;
}

export interface DriftRow {
  id: string;
  monthly_close_id: string;
  district_id: string;
  metric: "cases" | "rainfall" | "temp" | "humidity";
  observed_value: number;
  baseline_mean: number;
  baseline_std: number;
  z_score: number;
  severity: "warn" | "critical";
  created_at: string;
}

export interface PaginatedResponse<T> {
  monthly_close_id: string;
  count: number;
  skip: number;
  limit: number;
  items: T[];
}

export interface PageParams {
  skip?: number;
  limit?: number;
}

export const monthlyCloseApi = {
  get: async (
    id: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<MonthlyCloseDetail> => {
    const r = await apiClient.get(`/monthly-close/${id}`, { signal: options.signal });
    return r.data;
  },

  getBacktest: async (
    id: string,
    params: PageParams = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<PaginatedResponse<BacktestRow>> => {
    const r = await apiClient.get(`/monthly-close/${id}/backtest`, {
      params: { skip: params.skip ?? 0, limit: params.limit ?? 50 },
      signal: options.signal,
    });
    return r.data;
  },

  getDrift: async (
    id: string,
    params: PageParams & { severity?: "warn" | "critical" } = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<PaginatedResponse<DriftRow>> => {
    const { severity, skip, limit } = params;
    const query: Record<string, unknown> = {
      skip: skip ?? 0,
      limit: limit ?? 50,
    };
    if (severity) query.severity = severity;
    const r = await apiClient.get(`/monthly-close/${id}/drift`, {
      params: query,
      signal: options.signal,
    });
    return r.data;
  },
};
