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
    <div className="card full">
      <h2>Flow Efficiency</h2>
      <p className="desc">
        各タスクの実作業時間÷リードタイムを%で表示。低いほど待ち時間が多く、作業が滞留している
      </p>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis type="number" stroke="#8b949e" unit="%" />
          <YAxis type="category" dataKey="title" stroke="#8b949e" width={110} tick={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: "#161b22", border: "1px solid #30363d", padding: 8, fontSize: 12 }}>
                  <div>{d.title}</div>
                  <div>{d.efficiency}% ({d.status})</div>
                </div>
              );
            }}
          />
          <Bar dataKey="efficiency" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
