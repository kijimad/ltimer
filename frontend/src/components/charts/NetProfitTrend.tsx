import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Task, TimeUnit, DailyWorkEntry } from "../../types/index.ts";
import { periodKey, completedDate } from "../../hooks/usePeriodKey.ts";

interface Props {
  tasks: Task[];
  unit: TimeUnit;
  dailyWork: DailyWorkEntry[];
}

export function NetProfitTrend({ tasks, unit, dailyWork }: Props) {
  const data = useMemo(() => {
    const throughput: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status !== "DONE") continue;
      const cd = completedDate(t);
      if (!cd) continue;
      const pk = periodKey(cd, unit);
      throughput[pk] = (throughput[pk] || 0) + 1;
    }

    const oe: Record<string, number> = {};
    for (const entry of dailyWork) {
      const pk = periodKey(entry.date, unit);
      const totalMin = entry.tasks.reduce((s, t) => s + t.minutes, 0);
      oe[pk] = (oe[pk] || 0) + Math.round(totalMin / 60 * 10) / 10;
    }

    const periods = new Set([...Object.keys(throughput), ...Object.keys(oe)]);
    return Array.from(periods)
      .sort()
      .map((p) => ({
        period: p,
        Throughput: throughput[p] || 0,
        OE: oe[p] || 0,
      }));
  }, [tasks, unit, dailyWork]);

  return (
    <div className="card full">
      <h3>Net Profit (TOC)</h3>
      <p className="desc">
        純利益 = スループット(T) - 業務費用(OE)。緑棒が週/月あたり完了タスク数(T)、赤線が投入作業時間(OE)。Tが増えつつOEが減るのが理想。OEが高いのにTが低い週は非効率
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="period" stroke="#8b949e" />
          <YAxis yAxisId="left" stroke="#8b949e" label={{ value: "Tasks", angle: -90, position: "insideLeft" }} />
          <YAxis yAxisId="right" orientation="right" stroke="#8b949e" label={{ value: "Hours", angle: 90, position: "insideRight" }} />
          <Tooltip
            contentStyle={{
              background: "#161b22",
              border: "1px solid #30363d",
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="Throughput"
            fill="#3fb950"
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="OE"
            stroke="#f85149"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
