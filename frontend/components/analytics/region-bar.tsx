"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS, ChartFrame, GRID, tooltipProps } from "@/components/charts/chart-frame";
import type { RegionStat } from "@/types/analytics";

type Metric = "total_positive" | "high_risk_count";

const METRIC_LABEL: Record<Metric, string> = {
  total_positive: "Cases",
  high_risk_count: "High-risk districts",
};

/**
 * Reusable horizontal ranked bar over the per-region rollup. Rendered twice on
 * the page — once for case burden, once for high-risk district counts — so it
 * takes the metric key and fill color as props.
 */
export function RegionBar({
  data,
  metric,
  color,
}: {
  data: RegionStat[];
  metric: Metric;
  color: string;
}) {
  const sorted = data.slice().sort((a, b) => b[metric] - a[metric]);
  const height = Math.max(160, sorted.length * 30);

  return (
    <ChartFrame height={height} label={`${METRIC_LABEL[metric]} by region`}>
      <BarChart
        layout="vertical"
        data={sorted}
        margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
      >
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: AXIS }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="region"
          tick={{ fontSize: 10, fill: AXIS }}
          tickLine={false}
          axisLine={false}
          width={104}
        />
        <Tooltip {...tooltipProps} />
        <Bar dataKey={metric} name={METRIC_LABEL[metric]} fill={color} radius={[0, 2, 2, 0]} />
      </BarChart>
    </ChartFrame>
  );
}
