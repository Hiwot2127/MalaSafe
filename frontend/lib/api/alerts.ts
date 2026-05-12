import { apiClient } from './client';
import { Alert, Prediction } from '@/types/map';

export const alertsApi = {
  getAlerts: async (params?: {
    region?: string;
    risk_level?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<Alert[]> => {
    const response = await apiClient.get('/alerts', { params });
    return response.data;
  },

  getPredictionHistory: async (districtId: string): Promise<Prediction[]> => {
    const response = await apiClient.get(`/predictions/history/${districtId}`);
    return response.data;
  },
};
