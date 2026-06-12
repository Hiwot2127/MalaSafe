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
  recent_positive: number;
  /** "YYYY-MM" — the month the prediction is FOR (recent_positive is scoped to it). */
  prediction_period?: string | null;
  /** Human-readable form of `prediction_period`, e.g. "May 2026". */
  prediction_period_label?: string | null;
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

// One signed SHAP driver behind a prediction, as returned by the backend in
// `prediction_factors`. `direction` is authoritative (derived from the sign of
// the SHAP `impact`) — render the up/down arrow from it, never from `label`.
export interface PredictionFactor {
  feature_name: string;
  label: string;
  impact: number;
  value?: number | null;
  direction: 'increase' | 'decrease';
}

// Backend response from /api/v1/predictions/history/{district_id}.
export interface PredictionHistoryItem {
  id?: string;
  prediction_id?: string;
  district_id?: string;
  /** ISO date the prediction is for. Backend sends `prediction_date`; `date`
   *  is kept for older callers. */
  prediction_date?: string;
  date?: string;
  predicted_positive?: number;
  risk_level?: string;
  confidence_score?: number | null;
  prediction_score?: number;
  prediction_reason?: string | null;
  q10?: number | null;
  q90?: number | null;
  factors?: PredictionFactor[];
  created_at?: string;
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
  /** "YYYY-MM" the prediction is FOR — also the period `recent_positive` covers. */
  prediction_period?: string | null;
  prediction_period_label?: string | null;
  risk_level: 'low' | 'medium' | 'moderate' | 'high' | 'very_high';
  confidence_score: number;
  prediction_score: number;
  prediction_reason: string | null;
  recent_positive: number;
}

export interface LatestPredictionsResponse {
  items: PredictionRow[];
  total: number;
  skip: number;
  limit: number;
}
