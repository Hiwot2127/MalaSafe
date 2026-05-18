export interface DistrictOption {
  id: string;
  district_code: string;
  district_name: string;
  region: string;
}

export interface PredictionListItem {
  id: string;
  district_id: string;
  district_code: string;
  district_name: string;
  region: string;
  prediction_date: string;
  risk_level: string;
  confidence_score: number;
  prediction_score: number;
  prediction_reason: string | null;
  created_at: string | null;
}

export interface PredictionHistoryItem {
  id: string;
  prediction_date: string;
  risk_level: string;
  confidence_score: number;
  prediction_score: number;
  prediction_reason: string | null;
  created_at: string | null;
}

export interface PredictionHistoryResponse {
  district_code: string;
  district_name: string;
  predictions: PredictionHistoryItem[];
  total: number;
}
