"use client";

import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from "recharts";

import { AXIS, ChartFrame, GRID, riskColor, tooltipProps } from "@/components/charts/chart-frame";
import type { TopDistrict } from "@/lib/analytics-derive";

/**
 * The districts carrying the most recently-observed cases, each bar tinted by
 * its current risk bucket so burden and risk read together.
 */
export function TopDistrictsBar({ data }: { data: TopDistrict[] }) {
  const height = Math.max(160, data.length * 30);

  return (
    <ChartFrame height={height} label="Top districts by recent positive cases">
      <BarChart layout="vertical" data={data} margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
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
          dataKey="name"
          tick={{ fontSize: 10, fill: AXIS }}
          tickLine={false}
          axisLine={false}
          width={120}
        />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="recent_positive" name="Recent positive" radius={[0, 2, 2, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={riskColor(d.level)} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}
