import { useMemo } from "react";
import {
  LineChart,
  Line,
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

export function WipTrend({ tasks, unit }: Props) {
  const data = useMemo(() => {
    const periods = new Set<string>();
    const ranges = tasks.map((t) => {
      const start = periodKey(t.first_clock_in, unit);
      const cd = completedDate(t);
      const end = cd ? periodKey(cd, unit) : "9999";
      periods.add(start);
      if (cd) periods.add(periodKey(cd, unit));
      return { start, end };
    });

    const sorted = Array.from(periods).sort();
    return sorted.map((p) => ({
      period: p,
      wip: ranges.filter((r) => r.start <= p && p < r.end).length,
    }));
  }, [tasks, unit]);

  return (
    <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" stroke="#A0AEC0" />
          <YAxis stroke="#A0AEC0" />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
            }}
          />
          <Line
            type="monotone"
            dataKey="wip"
            stroke="#58a6ff"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
  );
}
