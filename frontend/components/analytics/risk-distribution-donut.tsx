"use client";

import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";

import { ChartFrame, riskColor, tooltipProps } from "@/components/charts/chart-frame";
import type { RiskSlice } from "@/lib/analytics-derive";

/**
 * Share of districts in each risk bucket as a donut. Slice colors follow the
 * green→red risk ramp so the composition reads without consulting the legend.
 */
export function RiskDistributionDonut({ data }: { data: RiskSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <ChartFrame height={260} label="District risk-level distribution">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="var(--color-background)"
          strokeWidth={2}
          label={({ percent }) =>
            percent != null && percent > 0.06 ? `${Math.round(percent * 100)}%` : ""
          }
          labelLine={false}
        >
          {data.map((slice) => (
            <Cell key={slice.level} fill={riskColor(slice.level)} />
          ))}
        </Pie>
        <Tooltip
          {...tooltipProps}
          formatter={(value, name) => {
            const v = Number(value) || 0;
            return [
              `${v.toLocaleString()} (${total ? Math.round((v / total) * 100) : 0}%)`,
              name as string,
            ];
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={24}
          iconType="circle"
          wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
        />
      </PieChart>
    </ChartFrame>
  );
}
