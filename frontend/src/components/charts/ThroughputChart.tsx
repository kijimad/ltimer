import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Task, TimeUnit } from "../../types/index.ts";
import { periodKey, completedDate } from "../../hooks/usePeriodKey.ts";

interface Props {
  tasks: Task[];
  unit: TimeUnit;
}

export function ThroughputChart({ tasks, unit }: Props) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status !== "DONE") continue;
      const cd = completedDate(t);
      if (!cd) continue;
      const pk = periodKey(cd, unit);
      counts[pk] = (counts[pk] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({ period, count }));
  }, [tasks, unit]);

  return (
    <div className="card full">
      <h3>Throughput</h3>
      <p className="desc">
        週/月ごとのDONE完了数。改善が進んでいるか、スループットが安定しているかを確認する
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="period" stroke="#8b949e" />
          <YAxis stroke="#8b949e" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#161b22",
              border: "1px solid #30363d",
            }}
          />
          <Bar
            dataKey="count"
            fill="#3fb950"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
