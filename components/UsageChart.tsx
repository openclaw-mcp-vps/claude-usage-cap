"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type UsagePoint = {
  day: string;
  spend: number;
};

type Props = {
  data: UsagePoint[];
  dailyCapUsd: number;
};

export function UsageChart({ data, dailyCapUsd }: Props) {
  return (
    <div className="h-[300px] w-full rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="day" tick={{ fill: "#8b949e", fontSize: 12 }} />
          <YAxis tick={{ fill: "#8b949e", fontSize: 12 }} width={48} />
          <Tooltip
            contentStyle={{
              background: "#0d1117",
              border: "1px solid #30363d",
              borderRadius: 8,
              color: "#e6edf3"
            }}
            formatter={(value) => `$${Number(value ?? 0).toFixed(4)}`}
          />
          <ReferenceLine
            y={dailyCapUsd}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ fill: "#ef4444", value: "Daily cap", fontSize: 11, position: "insideTopRight" }}
          />
          <Line
            type="monotone"
            dataKey="spend"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 2, fill: "#22c55e" }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
