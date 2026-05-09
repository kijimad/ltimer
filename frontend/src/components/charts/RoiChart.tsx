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

export function RoiChart({ tasks, unit }: Props) {
  const data = useMemo(() => {
    // Throughput per period
    const throughput: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status !== "DONE") continue;
      const cd = completedDate(t);
      if (!cd) continue;
      const pk = periodKey(cd, unit);
      throughput[pk] = (throughput[pk] || 0) + 1;
    }

    // WIP per period
    const periods = new Set<string>();
    const ranges = tasks.map((t) => {
      const start = periodKey(t.first_clock_in, unit);
      const cd = completedDate(t);
      const end = cd ? periodKey(cd, unit) : "9999";
      periods.add(start);
      if (cd) periods.add(periodKey(cd, unit));
      return { start, end };
    });

    // Merge all periods
    Object.keys(throughput).forEach((p) => periods.add(p));
    const sorted = Array.from(periods).sort();

    return sorted.map((p) => {
      const wip = ranges.filter((r) => r.start <= p && p < r.end).length;
      const t = throughput[p] || 0;
      return {
        period: p,
        ROI: wip > 0 ? Math.round((t / wip) * 100) / 100 : 0,
      };
    });
  }, [tasks, unit]);

  return (
    <div className="card full">
      <h3>ROI (T / I)</h3>
      <p className="desc">
        投資収益率 = スループット(T) / 在庫(I)。週/月あたり完了数÷WIP数。高いほど仕掛かり在庫が効率的にスループットへ変換されている。低い週はWIPが多すぎる兆候
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
            dataKey="ROI"
            stroke="#58a6ff"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
