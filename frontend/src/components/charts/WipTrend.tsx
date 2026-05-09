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
    <div className="card full">
      <h3>WIP Trend</h3>
      <p className="desc">
        週/月ごとの仕掛かり(WIP)数の推移。WIPが増え続けていれば着手過多でボトルネックの兆候
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="period" stroke="#8b949e" />
          <YAxis stroke="#8b949e" />
          <Tooltip
            contentStyle={{
              background: "#161b22",
              border: "1px solid #30363d",
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
    </div>
  );
}
