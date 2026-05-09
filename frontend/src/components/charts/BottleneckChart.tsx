import { useMemo } from "react";
import {
  ScatterChart as ReScatter, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ZAxis, Legend,
} from "recharts";
import type { Task } from "../../types/index.ts";
import { STATUS_COLORS } from "./colors.ts";

interface Props {
  tasks: Task[];
}

export function BottleneckChart({ tasks }: Props) {
  const byStatus = useMemo(() => {
    return (Object.keys(STATUS_COLORS) as Task["status"][]).map((status) => ({
      status,
      data: tasks
        .filter((t) => t.status === status && t.lead_time_days > 0)
        .map((t) => {
          const workDays = t.total_minutes / (60 * 24);
          const waitPct = Math.round(Math.max(0, 1 - workDays / t.lead_time_days) * 100);
          return {
            title: t.title,
            sessions: t.clock_count,
            leadTime: t.lead_time_days,
            waitPct,
            minutes: t.total_minutes,
          };
        }),
    }));
  }, [tasks]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ReScatter>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" dataKey="sessions" name="Sessions" stroke="#A0AEC0" />
        <YAxis type="number" dataKey="leadTime" name="Lead Time (d)" stroke="#A0AEC0" />
        <ZAxis type="number" dataKey="waitPct" range={[30, 300]} name="Wait %" />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: 8, fontSize: 12 }}>
                <div style={{ fontWeight: "bold" }}>{d.title}</div>
                <div>{d.sessions} sessions / {d.leadTime}d / {d.minutes}min / wait {d.waitPct}%</div>
              </div>
            );
          }}
        />
        <Legend />
        {byStatus.map(({ status, data }) => (
          <Scatter key={status} name={status} data={data} fill={STATUS_COLORS[status]} isAnimationActive={false} />
        ))}
      </ReScatter>
    </ResponsiveContainer>
  );
}
