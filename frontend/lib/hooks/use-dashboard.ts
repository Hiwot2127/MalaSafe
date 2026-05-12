'use client';

import { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analytics';
import { DashboardResponse } from '@/types/analytics';

export function useDashboard(region?: string) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await analyticsApi.getDashboard({ region });
        setData(response);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [region]);

  return { data, isLoading, error };
}
