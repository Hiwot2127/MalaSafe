"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AXIS, CHART, ChartFrame, GRID, tooltipProps } from "@/components/charts/chart-frame";
import type { TrendPointDerived } from "@/lib/analytics-derive";

/**
 * Monthly case movement as a filled area, with a 3-month trailing moving
 * average overlaid as a dashed line so the trend reads through the noise.
 * Replaces the old hand-rolled SVG polyline.
 */
export function CaseTrendChart({ data }: { data: TrendPointDerived[] }) {
  return (
    <ChartFrame height={300} label="Monthly malaria cases with 3-month moving average">
      <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: -6 }}>
        <defs>
          <linearGradient id="case-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART[0]} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 10, fill: AXIS }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          tick={{ fontSize: 10, fill: AXIS }}
          tickLine={false}
          axisLine={false}
          width={48}
          allowDecimals={false}
        />
        <Tooltip {...tooltipProps} />
        <Area
          type="monotone"
          dataKey="positive"
          name="Cases"
          stroke={CHART[0]}
          strokeWidth={2}
          fill="url(#case-area)"
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="movingAvg"
          name="3-mo avg"
          stroke={CHART[2]}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ChartFrame>
  );
}
