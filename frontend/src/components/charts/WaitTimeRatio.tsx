import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { Task } from "../../types/index.ts";

interface Props {
  tasks: Task[];
}

export function WaitTimeRatio({ tasks }: Props) {
  const { data, avg } = useMemo(() => {
    const items = tasks
      .filter((t) => t.lead_time_days > 0)
      .map((t) => {
        const workDays = t.total_minutes / (60 * 24);
        const waitRatio = Math.round(Math.max(0, 1 - workDays / t.lead_time_days) * 100 * 10) / 10;
        return {
          title: t.title.slice(0, 25),
          waitRatio,
          fill: waitRatio > 90 ? "#f85149" : waitRatio > 70 ? "#f0883e" : "#3fb950",
        };
      })
      .sort((a, b) => b.waitRatio - a.waitRatio);

    const avg = items.length > 0
      ? Math.round((items.reduce((s, d) => s + d.waitRatio, 0) / items.length) * 10) / 10
      : 0;

    return { data: items, avg };
  }, [tasks]);

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" stroke="#A0AEC0" unit="%" domain={[0, 100]} />
        <YAxis type="category" dataKey="title" stroke="#A0AEC0" width={110} tick={{ fontSize: 11 }} interval={0} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: 8, fontSize: 12 }}>
                <div>{d.title}</div>
                <div>待ち時間: {d.waitRatio}%</div>
              </div>
            );
          }}
        />
        <ReferenceLine x={avg} stroke="#CBD5E0" strokeDasharray="5 5" label={{ value: `avg: ${avg}%`, position: "top", fill: "#A0AEC0", fontSize: 11 }} />
        <Bar dataKey="waitRatio" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
