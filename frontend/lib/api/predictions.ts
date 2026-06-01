import { apiClient } from "./client";
import type {
  DistrictRiskCollection,
  LatestPredictionsResponse,
  PredictionHistoryResponse,
} from "@/types/predictions";

export const predictionsApi = {
  /**
   * Fetch the full per-district risk snapshot as GeoJSON. Backed by
   * /maps/risk. Used as the district picker source on /predictions
   * (Section 001) - the picker needs every district at once. The big
   * sortable "Latest by district" table uses getLatest() instead so the
   * page doesn't pull all ~600 districts over the wire.
   */
  async getRiskCollection(
    options: { signal?: AbortSignal } = {},
  ): Promise<DistrictRiskCollection> {
    const response = await apiClient.get<DistrictRiskCollection>("/maps/risk", {
      signal: options.signal,
    });
    return response.data;
  },

  /**
   * Paginated, filterable list of the latest per-district predictions.
   * Server returns a flat row shape (not GeoJSON) plus a total count so
   * the table can render page-of-N controls.
   */
  async getLatest(
    params: {
      q?: string;
      region?: string;
      risk_level?: string;
      skip?: number;
      limit?: number;
    } = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<LatestPredictionsResponse> {
    const response = await apiClient.get<LatestPredictionsResponse>(
      "/predictions/latest",
      {
        params: {
          skip: params.skip ?? 0,
          limit: params.limit ?? 25,
          ...(params.q ? { q: params.q } : {}),
          ...(params.region ? { region: params.region } : {}),
          ...(params.risk_level ? { risk_level: params.risk_level } : {}),
        },
        signal: options.signal,
      },
    );
    return response.data;
  },

  /**
   * Recent prediction history for a single district. The backend now
   * accepts `skip` so the per-district history table can page back; the
   * old `limit`-only signature is preserved for older callers.
   */
  async getHistory(
    districtId: string,
    params: {
      skip?: number;
      limit?: number;
      start_date?: string;
      end_date?: string;
    } = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<PredictionHistoryResponse> {
    const response = await apiClient.get(`/predictions/history/${districtId}`, {
      params: {
        skip: params.skip ?? 0,
        limit: params.limit ?? 30,
        ...(params.start_date ? { start_date: params.start_date } : {}),
        ...(params.end_date ? { end_date: params.end_date } : {}),
      },
      signal: options.signal,
    });
    const data = response.data;
    if (Array.isArray(data)) {
      return { district_id: districtId, predictions: data, total: data.length };
    }
    return {
      district_id: districtId,
      predictions: data?.predictions ?? [],
      total: data?.total,
    };
  },

  async generate(params: {
    district_id: string;
    target_month: string;
  }): Promise<any> {
    const response = await apiClient.post("/predictions/generate", params);
    return response.data;
  },
};
