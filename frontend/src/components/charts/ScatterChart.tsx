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
    <div className="card full">
      <h2>Lead Time vs Work Time</h2>
      <p className="desc">
        横軸がリードタイム(日)、縦軸が実作業時間(分)。右下に位置するタスクは「長期間かかっているが実作業が少ない」=滞留している
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <ReScatter>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis type="number" dataKey="x" name="Lead Time (days)" stroke="#8b949e" />
          <YAxis type="number" dataKey="y" name="Work Time (min)" stroke="#8b949e" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: "#161b22", border: "1px solid #30363d", padding: 8, fontSize: 12 }}>
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
    </div>
  );
}
