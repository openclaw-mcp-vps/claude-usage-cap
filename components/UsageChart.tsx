"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function UsageChart({ data }: { data: Array<{ date: string; spend: number }> }) {
  const chartData = useMemo(
    () => data.map((point) => ({ ...point, label: point.date.slice(5) })),
    [data]
  );

  return (
    <div className="h-72 w-full rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 14, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1f2b3a" strokeDasharray="3 4" />
          <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={{ stroke: "#334155" }} />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "#334155" }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip
            cursor={{ stroke: "#38bdf8", strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: "#0b1220",
              borderColor: "#334155",
              color: "#e5e7eb",
              borderRadius: 10
            }}
            formatter={(value: number) => [`$${value.toFixed(4)}`, "Spend"]}
          />
          <Area type="monotone" dataKey="spend" stroke="#38bdf8" strokeWidth={2.2} fill="url(#usageFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
