export interface RiskFeature {
  type: 'Feature';
  properties: {
    district_code: string;
    district_name: string;
    region: string;
    risk_level: 'low' | 'medium' | 'high' | 'very_high';
    cases: number;
    deaths: number;
    prediction_score?: number;
    confidence_score?: number;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
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
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  message: string;
  is_active: boolean;
  created_at: string;
}

export interface Prediction {
  id: string;
  district_id: string;
  district_name?: string;
  risk_level: 'low' | 'medium' | 'high' | 'very_high';
  confidence_score: number;
  prediction_score: number;
  prediction_reason: string;
  prediction_date: string;
  created_at: string;
}
