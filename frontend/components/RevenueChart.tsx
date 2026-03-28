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
    <section className="h-80 p-1">
      <p className="mb-3 text-sm font-medium text-[#474641]">
        {title ?? "Revenue over time"}
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            stroke="#a3a09a"
            tick={{ fill: "#8b8882", fontSize: 11 }}
            tickMargin={8}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="#a3a09a"
            tick={{ fill: "#8b8882", fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
            width={64}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e8e4de",
              color: "#1a1a1a",
              borderRadius: "10px",
            }}
            labelFormatter={(label) => formatDateLabel(String(label))}
            formatter={(value) => formatCurrency(Number(value))}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "#16a34a", fill: "#16a34a" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
