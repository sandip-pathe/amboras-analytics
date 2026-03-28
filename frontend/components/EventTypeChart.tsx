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
  purchase: "#16a34a",
};

const EVENT_LABELS: Record<keyof EventsByType, string> = {
  page_view: "Visitors",
  add_to_cart: "Added to Cart",
  remove_from_cart: "Removed from Cart",
  checkout_started: "Started Checkout",
  purchase: "Sales",
};

export function EventTypeChart({ eventsByType }: EventTypeChartProps) {
  const data = Object.entries(eventsByType).map(([name, value]) => ({
    name: EVENT_LABELS[name as keyof EventsByType],
    key: name,
    value,
  }));

  return (
    <section className="h-80 p-1">
      <p className="mb-3 text-sm font-medium text-[#474641]">Store Activity</p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 8, bottom: 8 }}
        >
          <CartesianGrid stroke="#ece9e3" horizontal={false} />
          <XAxis
            type="number"
            stroke="#a3a09a"
            tick={{ fill: "#8b8882", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={120}
            stroke="#a3a09a"
            tick={{ fill: "#595853", fontSize: 12 }}
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
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={EVENT_COLORS[entry.key as keyof EventsByType]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
