import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Task } from "../../types/index.ts";
import { STATUS_COLORS } from "./colors.ts";

interface Props {
  tasks: Task[];
}

export function FlowEfficiency({ tasks }: Props) {
  const data = useMemo(() => {
    return tasks
      .filter((t) => t.lead_time_days > 0)
      .map((t) => ({
        title: t.title.slice(0, 25),
        efficiency: Math.round((t.total_minutes / (t.lead_time_days * 24 * 60)) * 100 * 10) / 10,
        status: t.status,
        fill: STATUS_COLORS[t.status],
      }))
      .sort((a, b) => a.efficiency - b.efficiency);
  }, [tasks]);

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" stroke="#A0AEC0" unit="%" />
          <YAxis type="category" dataKey="title" stroke="#A0AEC0" width={110} tick={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: 8, fontSize: 12 }}>
                  <div>{d.title}</div>
                  <div>{d.efficiency}% ({d.status})</div>
                </div>
              );
            }}
          />
          <Bar dataKey="efficiency" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
  );
}
