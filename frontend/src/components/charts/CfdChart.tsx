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
  cutoff: string;
}

export function CfdChart({ tasks, unit, cutoff }: Props) {
  const data = useMemo(() => {
    const cutoffPeriod = periodKey(cutoff, unit);
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
        if (t.status === "CLOSE") {
          closedByPeriod[cp] = (closedByPeriod[cp] || 0) + 1;
        }
      }
    }

    const sorted = Array.from(periods).sort();
    let cumStarted = 0;
    let cumCompleted = 0;
    let cumClosed = 0;

    return sorted.reduce<{ period: string; Started: number; Completed: number; Closed: number }[]>((acc, p) => {
      cumStarted += startedByPeriod[p] || 0;
      cumCompleted += completedByPeriod[p] || 0;
      cumClosed += closedByPeriod[p] || 0;
      if (p >= cutoffPeriod) {
        acc.push({ period: p, Started: cumStarted, Completed: cumCompleted, Closed: cumClosed });
      }
      return acc;
    }, []);
  }, [tasks, unit, cutoff]);

  return (
    <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" stroke="#A0AEC0" />
          <YAxis stroke="#A0AEC0" />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
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
  );
}
