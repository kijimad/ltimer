import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import type { Task, TimeUnit } from "../../types/index.ts";
import { periodKey, completedDate } from "../../hooks/usePeriodKey.ts";

interface Props {
  tasks: Task[];
  unit: TimeUnit;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function PercentileChart({ tasks, unit }: Props) {
  const data = useMemo(() => {
    const byPeriod: Record<string, number[]> = {};
    for (const t of tasks) {
      if (t.status !== "DONE") continue;
      const cd = completedDate(t);
      if (!cd) continue;
      const pk = periodKey(cd, unit);
      (byPeriod[pk] ??= []).push(t.lead_time_days);
    }

    return Object.entries(byPeriod)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, leads]) => {
        const sorted = [...leads].sort((a, b) => a - b);
        return {
          period,
          p50: percentile(sorted, 50),
          p85: percentile(sorted, 85),
          p95: percentile(sorted, 95),
        };
      });
  }, [tasks, unit]);

  const globalP85 = useMemo(() => {
    const sorted = tasks
      .filter((t) => t.status === "DONE")
      .map((t) => t.lead_time_days)
      .sort((a, b) => a - b);
    return percentile(sorted, 85);
  }, [tasks]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#A0AEC0" />
        <YAxis stroke="#A0AEC0" unit=" d" />
        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0" }} />
        <Legend />
        <ReferenceLine y={globalP85} stroke="#CBD5E0" strokeDasharray="5 5" label={{ value: `SLE: ${globalP85}d`, position: "right", fill: "#A0AEC0", fontSize: 11 }} />
        <Line type="monotone" dataKey="p50" name="50th" stroke="#3fb950" isAnimationActive={false} />
        <Line type="monotone" dataKey="p85" name="85th" stroke="#f0883e" isAnimationActive={false} />
        <Line type="monotone" dataKey="p95" name="95th" stroke="#f85149" isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
