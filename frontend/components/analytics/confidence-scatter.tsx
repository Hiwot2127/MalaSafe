"use client";

import {
  CartesianGrid,
  Legend,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { AXIS, ChartFrame, GRID, riskColor, tooltipProps } from "@/components/charts/chart-frame";
import { LEVEL_ORDER, levelLabel, type ScatterPoint } from "@/lib/analytics-derive";

/**
 * Model prediction_score (x) vs confidence_score (y), one dot per district,
 * grouped into a series per risk bucket so the legend doubles as a risk key.
 * Surfaces where the model is confident-but-low vs uncertain-but-high.
 */
export function ConfidenceScatter({ points }: { points: ScatterPoint[] }) {
  const byLevel = LEVEL_ORDER.map((level) => ({
    level,
    data: points.filter((p) => p.level === level),
  })).filter((g) => g.data.length > 0);

  return (
    <ChartFrame height={260} label="District confidence versus prediction score by risk level">
      <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: -6 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" />
        <XAxis
          type="number"
          dataKey="x"
          name="Prediction score"
          tick={{ fontSize: 10, fill: AXIS }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Confidence"
          domain={[0, 1]}
          tick={{ fontSize: 10, fill: AXIS }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <ZAxis type="category" dataKey="name" name="District" />
        <Tooltip
          {...tooltipProps}
          cursor={{ strokeDasharray: "3 3", stroke: GRID }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
        />
        {byLevel.map((g) => (
          <Scatter
            key={g.level}
            name={levelLabel(g.level)}
            data={g.data}
            fill={riskColor(g.level)}
            fillOpacity={0.75}
          />
        ))}
      </ScatterChart>
    </ChartFrame>
  );
}
