import { apiClient } from './client';
import { DashboardResponse, TrendsResponse } from '@/types/analytics';

export const analyticsApi = {
  getDashboard: async (params?: {
    region?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<DashboardResponse> => {
    const response = await apiClient.get('/analytics/dashboard', { params });
    return response.data;
  },

  getTrends: async (params: {
    trend_type: 'weekly' | 'monthly';
    region?: string;
    year?: number;
    limit?: number;
  }): Promise<TrendsResponse> => {
    const response = await apiClient.get('/analytics/trends', { params });
    return response.data;
  },
};
