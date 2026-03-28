"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RevenueChartProps = {
  data: Array<{ date: string; revenue: number }>;
  title?: string;
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function RevenueChart({ data, title }: RevenueChartProps) {
  return (
    <section className="h-80 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="mb-4 text-sm font-medium text-zinc-300">
        {title ?? "Revenue"}
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            stroke="#71717a"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickMargin={8}
          />
          <YAxis
            stroke="#71717a"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
            width={64}
          />
          <Tooltip
            contentStyle={{
              background: "#09090b",
              border: "1px solid #27272a",
              color: "#fafafa",
              borderRadius: "10px",
            }}
            labelFormatter={(label) => formatDateLabel(String(label))}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "#10b981", fill: "#10b981" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
