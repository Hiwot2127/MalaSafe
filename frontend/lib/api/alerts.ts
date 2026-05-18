import { apiClient } from './client';
import { Alert, Prediction } from '@/types/map';

export interface AlertsListParams {
  active_only?: boolean;
  risk_level?: string;
  region?: string;
  district_code?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface AlertsListResponse {
  alerts: Alert[];
  total: number;
  active_count: number;
  high_risk_count: number;
}

export const alertsApi = {
  getAlerts: async (
    params: AlertsListParams = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<AlertsListResponse> => {
    const response = await apiClient.get('/alerts', {
      params,
      signal: options.signal,
    });
    return response.data;
  },

  getPredictionHistory: async (
    districtId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<Prediction[]> => {
    const response = await apiClient.get(`/predictions/history/${districtId}`, {
      signal: options.signal,
    });
    return response.data;
  },
};
