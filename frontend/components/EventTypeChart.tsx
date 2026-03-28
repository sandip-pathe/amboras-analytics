"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type EventsByType = {
  page_view: number;
  add_to_cart: number;
  remove_from_cart: number;
  checkout_started: number;
  purchase: number;
};

type EventTypeChartProps = {
  eventsByType: EventsByType;
};

const EVENT_COLORS: Record<keyof EventsByType, string> = {
  page_view: "#6366f1",
  add_to_cart: "#f59e0b",
  remove_from_cart: "#ef4444",
  checkout_started: "#8b5cf6",
  purchase: "#10b981",
};

export function EventTypeChart({ eventsByType }: EventTypeChartProps) {
  const data = Object.entries(eventsByType).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <section className="h-80 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="mb-4 text-sm font-medium text-zinc-300">Events By Type</p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#71717a"
            tick={{ fill: "#71717a", fontSize: 11 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis stroke="#71717a" tick={{ fill: "#71717a", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#09090b",
              border: "1px solid #27272a",
              color: "#fafafa",
              borderRadius: "10px",
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={EVENT_COLORS[entry.name as keyof EventsByType]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
