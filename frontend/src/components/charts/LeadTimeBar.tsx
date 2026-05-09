import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Task } from "../../types/index.ts";
import { STATUS_COLORS } from "./colors.ts";

export function LeadTimeBar({ tasks }: { tasks: Task[] }) {
  const sorted = [...tasks].sort((a, b) => b.lead_time_days - a.lead_time_days);
  const data = sorted.map((t) => ({
    name: t.title.slice(0, 30),
    days: t.lead_time_days,
    fill: STATUS_COLORS[t.status],
    minutes: t.total_minutes,
    status: t.status,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, sorted.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: 8, fontSize: 12 }}>
                  <div>{d.name}</div>
                  <div>{d.days}d / {d.minutes}min / {d.status}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="days" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
  );
}
