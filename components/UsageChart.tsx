"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type UsageChartPoint = {
  day: string;
  costUsd: number;
};

export function UsageChart({ data }: { data: UsageChartPoint[] }) {
  return (
    <div className="w-full rounded-2xl border border-[#1f2937] bg-[#111827]/80 p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">
        Spend Trend (Last {data.length} Days)
      </h3>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 6, right: 6, top: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickFormatter={(value) => value.slice(5)}
              axisLine={{ stroke: "#374151" }}
              tickLine={{ stroke: "#374151" }}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={{ stroke: "#374151" }}
              tickLine={{ stroke: "#374151" }}
              tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #1f2937",
                borderRadius: 12,
                color: "#e6edf3"
              }}
              formatter={(value: number) => [`$${value.toFixed(4)}`, "Daily Spend"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="costUsd"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#usageFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
