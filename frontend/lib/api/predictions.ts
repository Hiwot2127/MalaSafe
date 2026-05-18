import { apiClient } from './client';
import type {
  DistrictOption,
  PredictionHistoryResponse,
  PredictionListItem,
} from '@/types/predictions';

export const predictionsApi = {
  getDistricts: async (): Promise<{ districts: DistrictOption[] }> => {
    const response = await apiClient.get('/predictions/districts');
    return response.data;
  },

  getLatest: async (limit = 100): Promise<{ predictions: PredictionListItem[]; total: number }> => {
    const response = await apiClient.get('/predictions/latest', { params: { limit } });
    return response.data;
  },

  getHistory: async (
    districtId: string,
    params?: { limit?: number; start_date?: string; end_date?: string }
  ): Promise<PredictionHistoryResponse> => {
    const response = await apiClient.get(`/predictions/history/${districtId}`, { params });
    return response.data;
  },
};
