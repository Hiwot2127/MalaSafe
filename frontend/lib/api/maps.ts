import { apiClient } from './client';
import { RiskMapResponse } from '@/types/map';

export const mapsApi = {
  getRiskMap: async (params?: {
    region?: string;
    risk_level?: string;
  }): Promise<RiskMapResponse> => {
    const response = await apiClient.get('/maps/risk', { params });
    return response.data;
  },
};
