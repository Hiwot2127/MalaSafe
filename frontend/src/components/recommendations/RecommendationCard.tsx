/**
 * Recommendation Card Component
 * Compact card for displaying a single recommendation
 */
import React from 'react';
import {
  Recommendation,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CATEGORY_ICONS,
  RecommendationCategory,
} from '../../types/recommendation';

interface RecommendationCardProps {
  recommendation: Recommendation;
  showTrigger?: boolean;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  showTrigger = false,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {CATEGORY_ICONS[recommendation.category as RecommendationCategory]}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {recommendation.category}
          </span>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            PRIORITY_COLORS[recommendation.priority]
          }`}
        >
          {PRIORITY_LABELS[recommendation.priority]}
        </span>
      </div>

      {/* Recommendation Text */}
      <p className="text-sm text-gray-800 leading-relaxed mb-2">
        {recommendation.recommendation_text}
      </p>

      {/* Trigger Reason */}
      {showTrigger && recommendation.trigger_reason && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 italic">
            <span className="font-medium">Triggered by:</span>{' '}
            {recommendation.trigger_reason}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span className="capitalize">{recommendation.risk_level.replace('_', ' ')} risk</span>
        <span>{new Date(recommendation.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default RecommendationCard;
