"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatUsd } from "@/lib/utils";

type UsagePoint = {
  date: string;
  costUsd: number;
};

export function UsageChart({ data }: { data: UsagePoint[] }) {
  return (
    <div className="h-[320px] w-full rounded-xl border border-[#30363d] bg-[#111821]/70 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f81f7" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#2f81f7" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            stroke="#9da7b3"
            tickFormatter={(value: string) => value.slice(5)}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="#9da7b3"
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => `$${value.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0d1117",
              borderColor: "#30363d",
              color: "#e6edf3"
            }}
            formatter={(value: number) => [formatUsd(value), "Spend"]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area type="monotone" dataKey="costUsd" stroke="#2f81f7" fill="url(#usageGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
