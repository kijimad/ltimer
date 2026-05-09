import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Task, TimeUnit } from "../../types/index.ts";
import { periodKey, completedDate } from "../../hooks/usePeriodKey.ts";

interface Props {
  tasks: Task[];
  unit: TimeUnit;
}

export function CfdChart({ tasks, unit }: Props) {
  const data = useMemo(() => {
    const startedByPeriod: Record<string, number> = {};
    const completedByPeriod: Record<string, number> = {};
    const closedByPeriod: Record<string, number> = {};
    const periods = new Set<string>();

    for (const t of tasks) {
      const sp = periodKey(t.first_clock_in, unit);
      startedByPeriod[sp] = (startedByPeriod[sp] || 0) + 1;
      periods.add(sp);

      const cd = completedDate(t);
      if (cd && (t.status === "DONE" || t.status === "CLOSE")) {
        const cp = periodKey(cd, unit);
        completedByPeriod[cp] = (completedByPeriod[cp] || 0) + 1;
        periods.add(cp);
      }
      if (t.status === "CLOSE" && cd) {
        const cp = periodKey(cd, unit);
        closedByPeriod[cp] = (closedByPeriod[cp] || 0) + 1;
      }
    }

    const sorted = Array.from(periods).sort();
    let cumStarted = 0;
    let cumCompleted = 0;
    let cumClosed = 0;

    return sorted.map((p) => {
      cumStarted += startedByPeriod[p] || 0;
      cumCompleted += completedByPeriod[p] || 0;
      cumClosed += closedByPeriod[p] || 0;
      return {
        period: p,
        Started: cumStarted,
        Completed: cumCompleted,
        Closed: cumClosed,
      };
    });
  }, [tasks, unit]);

  return (
    <div className="card full">
      <h3>Cumulative Flow Diagram</h3>
      <p className="desc">
        週/月ごとのStarted/Completed/Closedの累積数を積み上げ面グラフで表示。バンド(帯)の幅がWIP量を示し、広がっていれば仕掛かりが増加している
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="period" stroke="#8b949e" />
          <YAxis stroke="#8b949e" />
          <Tooltip
            contentStyle={{
              background: "#161b22",
              border: "1px solid #30363d",
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="Started"
            stroke="#f0883e"
            fill="#f0883e"
            fillOpacity={0.3}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="Completed"
            stroke="#3fb950"
            fill="#3fb950"
            fillOpacity={0.3}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="Closed"
            stroke="#a371f7"
            fill="#a371f7"
            fillOpacity={0.3}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
