export type RiskLevel = 'low' | 'moderate' | 'medium' | 'high' | 'very_high';

export interface RiskFeature {
  type: 'Feature';
  properties: {
    district_code: string;
    district_name: string;
    region: string;
    geojson_key?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    risk_level: RiskLevel;
    recent_cases?: number;
    recent_deaths?: number;
    prediction_score?: number;
    confidence_score?: number;
    prediction_reason?: string;
    /** "YYYY-MM" the prediction (and its co-aligned cases/deaths) covers. */
    prediction_period?: string | null;
    /** Human-readable form of `prediction_period`, e.g. "May 2026". */
    prediction_period_label?: string | null;
  };
  geometry:
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] }
    | null;
}

export interface RiskMapResponse {
  type: 'FeatureCollection';
  features: RiskFeature[];
}

export interface Alert {
  id: string;
  district_id: string;
  district_name?: string;
  region?: string;
  risk_level: RiskLevel;
  message: string;
  is_active: boolean;
  created_at: string;
}

export interface Prediction {
  id: string;
  district_id: string;
  district_name?: string;
  risk_level: RiskLevel;
  confidence_score: number;
  prediction_score: number;
  prediction_reason: string;
  prediction_date: string;
  created_at: string;
}
