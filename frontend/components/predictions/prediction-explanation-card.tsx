/**
 * Prediction Explanation Card
 * 
 * Elegant visualization of AI prediction reasoning:
 * - Top contributing factors (SHAP values)
 * - Confidence interval (q10-q90)
 * - Confidence score
 * - Prediction trend
 * 
 * Uses waterfall/progression style to show factor contributions.
 * Avoids overwhelming users with ML terminology.
 */

import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PredictionFactor } from '@/types/predictions';

interface PredictionExplanationCardProps {
  prediction: {
    risk_level: string;
    prediction_score: number;
    confidence_score: number;
    prediction_reason: string | null;
    /** Authoritative signed drivers from the model. When present, these drive
     *  the Key Factors list (and its arrows). */
    factors?: PredictionFactor[] | null;
    q10?: number;
    q90?: number;
    prediction_date: string;
  };
  historicalTrend?: Array<{ date: string; value: number }>;
}

type DisplayFactor = { description: string; impact: 'increase' | 'decrease' };

export function PredictionExplanationCard({
  prediction,
  historicalTrend,
}: PredictionExplanationCardProps) {
  const {
    risk_level,
    prediction_score,
    confidence_score,
    prediction_reason,
    factors: structuredFactors,
    q10,
    q90,
    prediction_date,
  } = prediction;

  // Prefer the model's authoritative signed factors. Only fall back to parsing
  // the human-readable reason string for legacy rows that predate structured
  // factors (where direction can't be known and is best-effort).
  const factors = resolveFactors(structuredFactors, prediction_reason);
  
  // Confidence level interpretation
  const confidenceLevel = getConfidenceLevel(confidence_score);
  
  // Risk color
  const riskColor = getRiskColor(risk_level);

  return (
    <div className="rounded-2xl border border-border/40 bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 border-b border-border/40 ${riskColor.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
              Prediction for {new Date(prediction_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <h3 className="font-display font-semibold text-xl text-foreground">
              {risk_level.replace('_', ' ').toUpperCase()} Risk
            </h3>
          </div>
          <div className={`rounded-full px-4 py-2 ${riskColor.badge}`}>
            <span className="font-mono text-sm font-bold">
              {Math.round(prediction_score)} cases
            </span>
          </div>
        </div>
      </div>

      {/* Confidence Score */}
      <div className="px-6 py-5 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Confidence
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Confidence reflects the model's certainty based on data quality, 
                    historical patterns, and prediction interval width.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            {confidenceLevel.icon}
            <span className="font-medium text-sm">{confidenceLevel.label}</span>
          </div>
        </div>
        
        {/* Confidence bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${confidenceLevel.color}`}
            style={{ width: `${confidence_score * 100}%` }}
          />
        </div>
        
        <p className="mt-2 text-xs text-muted-foreground">
          {(confidence_score * 100).toFixed(0)}% confidence • {confidenceLevel.description}
        </p>
      </div>

      {/* Confidence Interval */}
      {q10 !== undefined && q90 !== undefined && (
        <div className="px-6 py-5 border-b border-border/40">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Expected Range
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    80% confidence interval: the actual case count is expected to fall 
                    within this range 8 out of 10 times.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {(() => {
            // Map the track to the full [low, high] span so the shaded q10–q90
            // band and the point estimate are positioned proportionally. The
            // point can legitimately fall outside [q10, q90] (it comes from a
            // different model than the quantile boosters), so widen the track to
            // include it and clamp every position into [0, 100].
            const lo = Math.min(q10, q90, prediction_score);
            const hi = Math.max(q10, q90, prediction_score);
            const span = Math.max(hi - lo, 1);
            const pct = (v: number) =>
              Math.min(100, Math.max(0, ((v - lo) / span) * 100));
            const q10Pct = pct(q10);
            const q90Pct = pct(q90);
            const pointPct = pct(prediction_score);
            return (
              <div className="relative">
                <div className="relative h-8 bg-muted/30 rounded-lg overflow-hidden">
                  {/* q10–q90 band */}
                  <div
                    className="absolute inset-y-0 bg-primary/20"
                    style={{ left: `${q10Pct}%`, width: `${Math.max(q90Pct - q10Pct, 1)}%` }}
                  />
                  {/* Prediction point */}
                  <div
                    className="absolute inset-y-0 w-0.5 bg-primary"
                    style={{ left: `${pointPct}%`, transform: 'translateX(-50%)' }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    {Math.round(q10)} cases
                  </span>
                  <span className="font-mono text-xs font-medium">
                    {Math.round(prediction_score)} expected
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {Math.round(q90)} cases
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Contributing Factors */}
      {factors.length > 0 && (
        <div className="px-6 py-5 border-b border-border/40">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Key Factors
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="size-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Top factors influencing this prediction, derived from the model's 
                    analysis of historical patterns, climate, and case trends.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="space-y-3">
            {factors.map((factor, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {factor.impact === 'increase' ? (
                    <TrendingUp className="size-4 text-status-error" strokeWidth={2} />
                  ) : (
                    <TrendingDown className="size-4 text-status-valid" strokeWidth={2} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground leading-relaxed">
                    {factor.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Trend Sparkline */}
      {historicalTrend && historicalTrend.length > 0 && (
        <div className="px-6 py-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3 block">
            Recent Trend
          </span>
          
          <div className="h-16 w-full">
            <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none">
              <TrendSparkline data={historicalTrend} />
            </svg>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {historicalTrend[0].date}
            </span>
            <span className="text-xs text-muted-foreground">
              {historicalTrend[historicalTrend.length - 1].date}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions

function resolveFactors(
  structured: PredictionFactor[] | null | undefined,
  reason: string | null,
): DisplayFactor[] {
  // Authoritative path: the model already told us each factor's direction from
  // the sign of its SHAP value. No guessing. An empty (but present) array is
  // authoritative too — e.g. cold-start predictions have no displayable
  // drivers, so we show none rather than fabricating from the reason string.
  if (structured) {
    return structured.slice(0, 3).map((f) => ({
      description: f.label,
      impact: f.direction === 'increase' ? 'increase' : 'decrease',
    }));
  }
  // Legacy fallback only for rows that predate structured factors entirely
  // (field absent). The reason string carries no sign, so direction here is a
  // best-effort guess from wording — kept only so old predictions render.
  if (!reason) return [];
  return reason
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => {
      const lower = part.toLowerCase();
      const isIncrease =
        lower.includes('high') ||
        lower.includes('elevated') ||
        lower.includes('heavy') ||
        lower.includes('warm') ||
        lower.includes('peak') ||
        lower.includes('above') ||
        lower.includes('increase');
      return { description: part, impact: isIncrease ? 'increase' : 'decrease' };
    });
}

function getConfidenceLevel(score: number): {
  label: string;
  description: string;
  color: string;
  icon: React.ReactNode;
} {
  if (score >= 0.8) {
    return {
      label: 'High',
      description: 'Strong historical patterns and complete data',
      color: 'bg-status-valid',
      icon: <CheckCircle2 className="size-4 text-status-valid" strokeWidth={2} />,
    };
  } else if (score >= 0.6) {
    return {
      label: 'Moderate',
      description: 'Good data quality with some uncertainty',
      color: 'bg-status-warn',
      icon: <AlertCircle className="size-4 text-status-warn" strokeWidth={2} />,
    };
  } else {
    return {
      label: 'Low',
      description: 'Limited historical data or cold-start prediction',
      color: 'bg-status-error',
      icon: <AlertCircle className="size-4 text-status-error" strokeWidth={2} />,
    };
  }
}

function getRiskColor(risk_level: string): { bg: string; badge: string } {
  switch (risk_level) {
    case 'very_high':
      return { bg: 'bg-status-error/5', badge: 'bg-status-error/10 text-status-error' };
    case 'high':
      return { bg: 'bg-status-warn/5', badge: 'bg-status-warn/10 text-status-warn' };
    case 'moderate':
      return { bg: 'bg-primary/5', badge: 'bg-primary/10 text-primary' };
    default:
      return { bg: 'bg-status-valid/5', badge: 'bg-status-valid/10 text-status-valid' };
  }
}

function TrendSparkline({ data }: { data: Array<{ date: string; value: number }> }) {
  const max = Math.max(...data.map(d => d.value));
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 40 - (d.value / max) * 35;
    return `${x},${y}`;
  }).join(' ');

  return (
    <>
      <polyline
        fill="none"
        stroke="currentColor"
        className="text-primary"
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M0,40 L${points} L100,40 Z`}
        fill="url(#sparkline-gradient)"
        opacity="0.1"
      />
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" className="text-primary" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </>
  );
}
