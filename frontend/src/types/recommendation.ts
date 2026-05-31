/**
 * Response Recommendation Types
 * TypeScript interfaces for malaria response recommendations
 */

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

export type RecommendationCategory =
  | 'Prevention'
  | 'Medical Preparedness'
  | 'Surveillance'
  | 'Community Awareness'
  | 'Logistics'
  | 'Escalation';

export interface Recommendation {
  id: string;
  prediction_id: string;
  district_id: string;
  risk_level: string;
  category: RecommendationCategory;
  recommendation_text: string;
  priority: RecommendationPriority;
  trigger_reason: string | null;
  created_at: string;
}

export interface PredictionInfo {
  risk_level: string;
  confidence_score: number;
  prediction_score: number;
  prediction_date: string;
  district_name: string;
  district_code: string | null;
  region?: string;
}

export interface RecommendationListResponse {
  recommendations: Recommendation[];
  total: number;
  prediction_info: PredictionInfo | null;
}

export interface GenerateRecommendationsRequest {
  force?: boolean;
}

export interface GenerateRecommendationsResponse {
  success: boolean;
  prediction_id: string;
  recommendations_count: number;
  message: string;
}

// Grouped recommendations by category
export interface GroupedRecommendations {
  [category: string]: Recommendation[];
}

// Priority badge colors
export const PRIORITY_COLORS: Record<RecommendationPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

// Priority display names
export const PRIORITY_LABELS: Record<RecommendationPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

// Category icons (using emoji for simplicity)
export const CATEGORY_ICONS: Record<RecommendationCategory, string> = {
  'Prevention': '🛡️',
  'Medical Preparedness': '💊',
  'Surveillance': '🔍',
  'Community Awareness': '📢',
  'Logistics': '📦',
  'Escalation': '🚨',
};
