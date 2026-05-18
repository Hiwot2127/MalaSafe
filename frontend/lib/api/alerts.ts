import { apiClient } from './client';
import { Alert, Prediction } from '@/types/map';

export const alertsApi = {
  getAlerts: async (params?: {
    region?: string;
    risk_level?: string;
    is_active?: boolean;
    limit?: number;
  }): Promise<Alert[]> => {
    const { is_active, ...rest } = params ?? {};
    const response = await apiClient.get('/alerts', {
      params: {
        ...rest,
        active_only: is_active !== undefined ? is_active : true,
      },
    });
    return response.data.alerts ?? [];
  },

  getPredictionHistory: async (districtId: string): Promise<Prediction[]> => {
    const response = await apiClient.get(`/predictions/history/${districtId}`);
    return response.data;
  },
};
