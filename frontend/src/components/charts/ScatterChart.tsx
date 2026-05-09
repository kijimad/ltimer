import { useMemo } from "react";
import {
  ScatterChart as ReScatter, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { Task } from "../../types/index.ts";
import { STATUS_COLORS, GRID_STROKE, AXIS_STROKE, TOOLTIP_DIV_STYLE } from "./colors.ts";

interface Props {
  tasks: Task[];
}

export function ScatterChart({ tasks }: Props) {
  const byStatus = useMemo(
    () =>
      (Object.keys(STATUS_COLORS) as Task["status"][]).map((status) => ({
        status,
        data: tasks
          .filter((t) => t.status === status)
          .map((t) => ({ x: t.lead_time_days, y: t.total_minutes, title: t.title })),
      })),
    [tasks],
  );

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ReScatter>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis type="number" dataKey="x" name="Lead Time (days)" stroke={AXIS_STROKE} />
        <YAxis type="number" dataKey="y" name="Work Time (min)" stroke={AXIS_STROKE} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div style={TOOLTIP_DIV_STYLE}>
                <div>{d.title}</div>
                <div>{d.x}d / {d.y}min</div>
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
