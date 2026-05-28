/**
 * Recommendation Panel Component
 * Displays response recommendations for malaria predictions
 */
import React, { useState, useEffect } from 'react';
import {
  Recommendation,
  RecommendationListResponse,
  GroupedRecommendations,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CATEGORY_ICONS,
  RecommendationCategory,
} from '../../types/recommendation';
import axios from 'axios';

interface RecommendationPanelProps {
  predictionId: string;
  onGenerate?: () => void;
}

const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  predictionId,
  onGenerate,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RecommendationListResponse | null>(null);
  const [generating, setGenerating] = useState(false);

  // Fetch recommendations
  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<RecommendationListResponse>(
        `/api/v1/recommendations/${predictionId}`
      );
      
      setData(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('No recommendations found. Click "Generate Recommendations" to create them.');
      } else {
        setError('Failed to load recommendations. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate recommendations
  const handleGenerate = async (force: boolean = false) => {
    try {
      setGenerating(true);
      setError(null);
      
      await axios.post(`/api/v1/recommendations/generate/${predictionId}`, {
        force,
      });
      
      // Refresh recommendations
      await fetchRecommendations();
      
      if (onGenerate) {
        onGenerate();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [predictionId]);

  // Group recommendations by category
  const groupedRecommendations: GroupedRecommendations = React.useMemo(() => {
    if (!data?.recommendations) return {};
    
    return data.recommendations.reduce((acc, rec) => {
      if (!acc[rec.category]) {
        acc[rec.category] = [];
      }
      acc[rec.category].push(rec);
      return acc;
    }, {} as GroupedRecommendations);
  }, [data]);

  // Get highest priority
  const highestPriority = React.useMemo(() => {
    if (!data?.recommendations || data.recommendations.length === 0) return null;
    
    const priorities = ['critical', 'high', 'medium', 'low'];
    for (const priority of priorities) {
      if (data.recommendations.some(r => r.priority === priority)) {
        return priority;
      }
    }
    return null;
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state with generate option
  if (error && !data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recommended Response Plan
        </h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
        <button
          onClick={() => handleGenerate(false)}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'Generating...' : 'Generate Recommendations'}
        </button>
      </div>
    );
  }

  // Empty state
  if (!data || data.recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recommended Response Plan
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No recommendations available</p>
          <button
            onClick={() => handleGenerate(false)}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Recommendations'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Recommended Response Plan
            </h3>
            {data.prediction_info && (
              <p className="text-sm text-gray-600 mt-1">
                {data.prediction_info.district_name} •{' '}
                Risk: <span className="font-medium capitalize">{data.prediction_info.risk_level.replace('_', ' ')}</span> •{' '}
                Confidence: {(data.prediction_info.confidence_score * 100).toFixed(0)}%
              </p>
            )}
          </div>
          
          {highestPriority && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Priority:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLORS[highestPriority as keyof typeof PRIORITY_COLORS]}`}>
                {PRIORITY_LABELS[highestPriority as keyof typeof PRIORITY_LABELS]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations by Category */}
      <div className="p-6 space-y-6">
        {Object.entries(groupedRecommendations).map(([category, recommendations]) => (
          <div key={category} className="space-y-3">
            {/* Category Header */}
            <div className="flex items-center gap-2">
              <span className="text-xl">{CATEGORY_ICONS[category as RecommendationCategory]}</span>
              <h4 className="text-md font-semibold text-gray-900">{category}</h4>
              <span className="text-sm text-gray-500">({recommendations.length})</span>
            </div>

            {/* Recommendations List */}
            <div className="space-y-2 ml-8">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="group relative pl-4 border-l-2 border-gray-200 hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {rec.recommendation_text}
                      </p>
                      
                      {rec.trigger_reason && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            Why this recommendation?
                          </summary>
                          <p className="text-xs text-gray-600 mt-1 pl-4 italic">
                            {rec.trigger_reason}
                          </p>
                        </details>
                      )}
                    </div>
                    
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${PRIORITY_COLORS[rec.priority]}`}>
                      {PRIORITY_LABELS[rec.priority]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {data.total} recommendations • Generated {new Date(data.recommendations[0]?.created_at).toLocaleDateString()}
          </p>
          <button
            onClick={() => handleGenerate(true)}
            disabled={generating}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {generating ? 'Regenerating...' : 'Regenerate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecommendationPanel;
