"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
  data: { status: string; count: number }[];
};

const COLORS: Record<string, string> = {
  ACTIVE: "#22C55E",          // accent green
  EXPIRING_SOON: "#F59E0B",   // amber
  EXPIRED: "#EF4444",         // red
  FROZEN: "#94A3B8",          // slate
  CANCELLED: "#64748B",
  PENDING_PAYMENT: "#A3E635", // brand lime
  INACTIVE: "#CBD5E1",
};

const LABELS: Record<string, string> = {
  EXPIRING_SOON: "Expiring",
  PENDING_PAYMENT: "Pending",
};

export function MemberStatusChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: LABELS[d.status] ?? humanize(d.status),
    value: d.count,
    color: COLORS[d.status] ?? "#A3E635",
  }));

  if (chartData.every((d) => d.value === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No member data yet
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            stroke="hsl(var(--card))"
            strokeWidth={2}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.375rem",
              fontSize: "0.75rem",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "0.75rem" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function humanize(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
