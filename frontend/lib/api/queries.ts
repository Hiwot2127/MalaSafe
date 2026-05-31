/**
 * React Query Hooks
 * 
 * Type-safe query hooks for all API endpoints.
 * Provides automatic caching, refetching, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from './analytics';
import { mapsApi } from './maps';
import { predictionsApi } from './predictions';
import { alertsApi } from './alerts';
import { uploadsApi } from './uploads';
import type { DashboardSummary, TrendDataPoint } from '@/types/analytics';
import type { RiskMapResponse } from '@/types/map';

// Query Keys - Centralized for consistency
export const queryKeys = {
  dashboard: (year?: number, month?: number, region?: string) => 
    ['dashboard', { year, month, region }] as const,
  trends: (params: { trend_type: string; year?: number; limit?: number; region?: string }) =>
    ['trends', params] as const,
  riskMap: (date_filter?: string, region?: string) =>
    ['risk-map', { date_filter, region }] as const,
  predictions: (districtId: string, params?: any) =>
    ['predictions', districtId, params] as const,
  alerts: (params?: any) =>
    ['alerts', params] as const,
  monthlyCloses: (params?: any) =>
    ['monthly-closes', params] as const,
};

// Dashboard Query
export function useDashboard(year?: number, month?: number, region?: string) {
  return useQuery({
    queryKey: queryKeys.dashboard(year, month, region),
    queryFn: () => analyticsApi.getDashboard({ year, month, region }),
    // Dashboard data is critical - keep it fresh
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Trends Query
export function useTrends(params: {
  trend_type: 'weekly' | 'monthly';
  year?: number;
  limit?: number;
  region?: string;
}) {
  return useQuery({
    queryKey: queryKeys.trends(params),
    queryFn: () => analyticsApi.getTrends(params),
    // Trends change less frequently
    staleTime: 60 * 1000, // 1 minute
  });
}

// Risk Map Query
export function useRiskMap(date_filter?: string, region?: string) {
  return useQuery({
    queryKey: queryKeys.riskMap(date_filter, region),
    queryFn: () => mapsApi.getRiskMap({ date_filter, region }),
    // Map data is relatively stable
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Predictions Query
export function usePredictionHistory(
  districtId: string,
  params?: { limit?: number; start_date?: string; end_date?: string }
) {
  return useQuery({
    queryKey: queryKeys.predictions(districtId, params),
    queryFn: () => predictionsApi.getHistory(districtId, params),
    enabled: !!districtId, // Only run if districtId is provided
    staleTime: 60 * 1000, // 1 minute
  });
}

// Alerts Query
export function useAlerts(params?: {
  active_only?: boolean;
  risk_level?: string;
  region?: string;
  district_code?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.alerts(params),
    queryFn: () => alertsApi.getAlerts(params),
    // Alerts are time-sensitive
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 60 * 1000, // Auto-refetch every minute
  });
}

// Upload Mutation
export function useUploadMalaria() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => uploadsApi.uploadMalaria(file),
    onSuccess: () => {
      // Invalidate relevant queries after successful upload
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['trends'] });
      queryClient.invalidateQueries({ queryKey: ['risk-map'] });
    },
  });
}

// Upload Climate Mutation
export function useUploadClimate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => uploadsApi.uploadClimate(file),
    onSuccess: () => {
      // Invalidate relevant queries after successful upload
      queryClient.invalidateQueries({ queryKey: ['risk-map'] });
    },
  });
}

// Generate Prediction Mutation
export function useGeneratePrediction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { district_id: string; target_month: string }) =>
      predictionsApi.generate(params),
    onSuccess: (_, variables) => {
      // Invalidate predictions for this district
      queryClient.invalidateQueries({ 
        queryKey: ['predictions', variables.district_id] 
      });
    },
  });
}
