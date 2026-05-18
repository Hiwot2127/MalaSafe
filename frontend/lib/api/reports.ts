import { apiClient } from './client';
import type { ReportsOverview } from '@/types/reports';

export const reportsApi = {
  getOverview: async (year?: number): Promise<ReportsOverview> => {
    const response = await apiClient.get('/reports/overview', {
      params: year != null ? { year } : undefined,
    });
    return response.data;
  },
};
