import {
  ScatterChart as ReScatter,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Task } from "../../types/index.ts";
import { STATUS_COLORS } from "./colors.ts";

interface Props {
  tasks: Task[];
}

export function ScatterChart({ tasks }: Props) {
  const byStatus = (Object.keys(STATUS_COLORS) as Task["status"][]).map((status) => ({
    status,
    data: tasks
      .filter((t) => t.status === status)
      .map((t) => ({ x: t.lead_time_days, y: t.total_minutes, title: t.title })),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
        <ReScatter>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" dataKey="x" name="Lead Time (days)" stroke="#A0AEC0" />
          <YAxis type="number" dataKey="y" name="Work Time (min)" stroke="#A0AEC0" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: 8, fontSize: 12 }}>
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
