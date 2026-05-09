import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Task } from "../../types/index.ts";

interface Props {
  tasks: Task[];
}

export function AgingWip({ tasks }: Props) {
  const data = useMemo(() => {
    const now = Date.now();
    return tasks
      .filter((t) => t.status === "TODO")
      .map((t) => {
        const days = Math.round((now - new Date(t.first_clock_in).getTime()) / (1000 * 60 * 60 * 24));
        return {
          title: t.title.slice(0, 25),
          days,
          fill: days > 30 ? "#f85149" : "#f0883e",
        };
      })
      .sort((a, b) => b.days - a.days);
  }, [tasks]);

  return (
    <div className="card full">
      <h2>Aging WIP</h2>
      <p className="desc">
        現在TODOのタスクが最初のクロックインから何日経過しているか。30日超は赤色で警告
      </p>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis type="number" stroke="#8b949e" unit=" d" />
          <YAxis type="category" dataKey="title" stroke="#8b949e" width={110} tick={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: "#161b22", border: "1px solid #30363d", padding: 8, fontSize: 12 }}>
                  <div>{d.title}</div>
                  <div>{d.days} days</div>
                </div>
              );
            }}
          />
          <Bar dataKey="days" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
