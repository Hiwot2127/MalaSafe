/**
 * React Query Hooks
 * * Type-safe query hooks for all API endpoints.
 * Provides automatic caching, refetching, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi } from "./analytics";
import { mapsApi } from "./maps";
import { predictionsApi } from "./predictions";
import { alertsApi } from "./alerts";
import { uploadsApi } from "./uploads";

// Query Keys - Centralized for consistency
export const queryKeys = {
  dashboard: (params: {
    region?: string;
    start_date?: string;
    end_date?: string;
  }) => ["dashboard", params] as const,
  trends: (params: {
    trend_type: "weekly" | "monthly";
    year?: number;
    limit?: number;
    region?: string;
  }) => ["trends", params] as const,
  riskMap: (params: { region?: string; risk_level?: string }) =>
    ["risk-map", params] as const,
  predictions: (
    districtId: string,
    params?: {
      skip?: number;
      limit?: number;
      start_date?: string;
      end_date?: string;
    },
  ) => ["predictions", districtId, params] as const,
  alerts: (params?: any) => ["alerts", params] as const,
  monthlyCloses: (params?: any) => ["monthly-closes", params] as const,
};

// Dashboard Query
export function useDashboard(
  params: { region?: string; start_date?: string; end_date?: string } = {},
) {
  return useQuery({
    queryKey: queryKeys.dashboard(params),
    queryFn: () => analyticsApi.getDashboard(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Trends Query
export function useTrends(params: {
  trend_type: "weekly" | "monthly";
  year?: number;
  limit?: number;
  region?: string;
}) {
  return useQuery({
    queryKey: queryKeys.trends(params),
    queryFn: () => analyticsApi.getTrends(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

// Risk Map Query
export function useRiskMap(region?: string, risk_level?: string) {
  const params = { region, risk_level };
  return useQuery({
    queryKey: queryKeys.riskMap(params),
    queryFn: () => mapsApi.getRiskMap(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Predictions Query
export function usePredictionHistory(
  districtId: string,
  params?: {
    skip?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
  },
) {
  return useQuery({
    queryKey: queryKeys.predictions(districtId, params),
    queryFn: () => predictionsApi.getHistory(districtId, params),
    enabled: !!districtId,
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
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 60 * 1000, // Auto-refetch every minute
  });
}

// Upload Malaria Mutation
export function useUploadMalaria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadsApi.uploadMalaria(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["trends"] });
      queryClient.invalidateQueries({ queryKey: ["risk-map"] });
    },
  });
}

// Upload Climate Mutation
export function useUploadClimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadsApi.uploadClimate(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-map"] });
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
      queryClient.invalidateQueries({
        queryKey: ["predictions", variables.district_id],
      });
    },
  });
}
