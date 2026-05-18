import { apiClient } from './client';
import type {
  DistrictRiskCollection,
  PredictionHistoryResponse,
} from '@/types/predictions';

export const predictionsApi = {
  /**
   * Fetch the current per-district risk snapshot. Backed by /maps/risk -
   * the only endpoint that lists districts together with their latest
   * prediction. Used both as the district picker source and as the
   * "latest predictions" table.
   */
  async getRiskCollection(): Promise<DistrictRiskCollection> {
    const response = await apiClient.get<DistrictRiskCollection>('/maps/risk');
    return response.data;
  },

  /**
   * Recent prediction history for a single district. The backend currently
   * returns a list; we shape it into { district_id, predictions } so the
   * page can stay agnostic to schema drift.
   */
  async getHistory(
    districtId: string,
    params?: { limit?: number; start_date?: string; end_date?: string },
  ): Promise<PredictionHistoryResponse> {
    const response = await apiClient.get(`/predictions/history/${districtId}`, { params });
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
};
