import { apiClient } from './client';
import { RiskMapResponse } from '@/types/map';

export interface RiskMapParams {
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
