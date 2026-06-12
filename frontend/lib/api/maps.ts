import { apiClient } from './client';
import { RiskMapResponse } from '@/types/map';

export interface RiskMapParams {
  /** Filter predictions by date (ISO "YYYY-MM-DD"); defaults to today server-side. */
  date_filter?: string;
  region?: string;
  risk_level?: string;
}

export const mapsApi = {
  getRiskMap: async (
    params: RiskMapParams = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<RiskMapResponse> => {
    const response = await apiClient.get('/maps/risk', {
      params,
      signal: options.signal,
    });
    return response.data;
  },
};
