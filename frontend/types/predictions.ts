// Shape of the GeoJSON feature returned from /api/v1/maps/risk.
// Each feature carries the latest prediction and a recent-history snapshot
// for one district.
export interface DistrictRiskProperties {
  district_id: string;
  district_code: string;
  district_name: string;
  region: string;
  geojson_key: string | null;
  latitude: number;
  longitude: number;
  risk_level: 'low' | 'medium' | 'moderate' | 'high' | 'very_high';
  confidence_score: number;
  prediction_score: number;
  prediction_reason: string | null;
  recent_cases: number;
  recent_deaths: number;
}

export interface DistrictRiskFeature {
  type: 'Feature';
  properties: DistrictRiskProperties;
  geometry: unknown;
}

export interface DistrictRiskCollection {
  type: 'FeatureCollection';
  features: DistrictRiskFeature[];
  metadata?: Record<string, unknown>;
}

// Backend response from /api/v1/predictions/history/{district_id}.
// Shape kept loose since the backend schema isn't fully specified yet.
export interface PredictionHistoryItem {
  prediction_id?: string;
  district_id?: string;
  date: string; // ISO 8601
  predicted_cases?: number;
  predicted_deaths?: number;
  risk_level?: string;
  confidence_score?: number | null;
  prediction_score?: number;
}

export interface PredictionHistoryResponse {
  district_id: string;
  predictions: PredictionHistoryItem[];
  total?: number;
}

// Paginated row returned from /api/v1/predictions/latest — the flat,
// table-shaped version of a district's most recent prediction.
export interface PredictionRow {
  district_id: string;
  district_code: string;
  district_name: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  prediction_date: string | null;
  risk_level: 'low' | 'medium' | 'moderate' | 'high' | 'very_high';
  confidence_score: number;
  prediction_score: number;
  prediction_reason: string | null;
  recent_cases: number;
}

export interface LatestPredictionsResponse {
  items: PredictionRow[];
  total: number;
  skip: number;
  limit: number;
}
