import { useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { Task, TimeUnit } from "../../types/index.ts";
import { periodKey, completedDate } from "../../hooks/usePeriodKey.ts";

interface Props {
  tasks: Task[];
  unit: TimeUnit;
  startedAt: string;
}

export function LittlesLaw({ tasks, unit, startedAt }: Props) {
  const data = useMemo(() => {
    const startedAtPeriod = periodKey(startedAt, unit);
    const throughput: Record<string, number> = {};
    const leadTimes: Record<string, number[]> = {};
    const periods = new Set<string>();

    const ranges = tasks.map((t) => {
      const start = periodKey(t.first_clock_in, unit);
      const cd = completedDate(t);
      const end = cd ? periodKey(cd, unit) : "9999";
      periods.add(start);
      if (cd) periods.add(end);

      if (t.status === "DONE" && cd) {
        const pk = periodKey(cd, unit);
        throughput[pk] = (throughput[pk] || 0) + 1;
        (leadTimes[pk] ??= []).push(t.lead_time_days);
      }

      return { start, end };
    });

    const sorted = Array.from(periods).sort();
    return sorted
      .filter((p) => p >= startedAtPeriod)
      .map((p) => {
        const wip = ranges.filter((r) => r.start <= p && p < r.end).length;
        const tp = throughput[p] || 0;
        const avgLt = leadTimes[p]
          ? Math.round((leadTimes[p].reduce((s, v) => s + v, 0) / leadTimes[p].length) * 10) / 10
          : 0;
        const predicted = tp > 0 ? Math.round((wip / tp) * 10) / 10 : 0;
        return { period: p, "Actual LT": avgLt, "Predicted (WIP/T)": predicted, WIP: wip };
      });
  }, [tasks, unit, startedAt]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#A0AEC0" />
        <YAxis yAxisId="left" stroke="#A0AEC0" label={{ value: "Days", angle: -90, position: "insideLeft" }} />
        <YAxis yAxisId="right" orientation="right" stroke="#A0AEC0" label={{ value: "WIP", angle: 90, position: "insideRight" }} />
        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0" }} />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="Actual LT" stroke="#3fb950" isAnimationActive={false} />
        <Line yAxisId="left" type="monotone" dataKey="Predicted (WIP/T)" stroke="#f0883e" strokeDasharray="5 5" isAnimationActive={false} />
        <Bar yAxisId="right" dataKey="WIP" fill="#58a6ff" opacity={0.3} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
