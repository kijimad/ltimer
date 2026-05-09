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
    <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" stroke="#A0AEC0" />
          <YAxis stroke="#A0AEC0" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
            }}
          />
          <Bar
            dataKey="count"
            fill="#3fb950"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
  );
}
