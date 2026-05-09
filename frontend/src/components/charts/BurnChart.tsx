import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Task } from "../../types/index.ts";
import { completedDate } from "../../hooks/usePeriodKey.ts";

interface Props {
  tasks: Task[];
}

export function BurnChart({ tasks }: Props) {
  const data = useMemo(() => {
    const startDates: Record<string, number> = {};
    const completeDates: Record<string, number> = {};
    const allDates = new Set<string>();

    for (const t of tasks) {
      const sd = t.first_clock_in.slice(0, 10);
      startDates[sd] = (startDates[sd] || 0) + 1;
      allDates.add(sd);

      const cd = completedDate(t);
      if (cd) {
        completeDates[cd] = (completeDates[cd] || 0) + 1;
        allDates.add(cd);
      }
    }

    const sorted = Array.from(allDates).sort();
    let cumStarted = 0;
    let cumCompleted = 0;

    return sorted.map((date) => {
      cumStarted += startDates[date] || 0;
      cumCompleted += completeDates[date] || 0;
      return {
        date,
        Started: cumStarted,
        Completed: cumCompleted,
        WIP: cumStarted - cumCompleted,
      };
    });
  }, [tasks]);

  return (
    <div className="card full">
      <h3>Burn Chart</h3>
      <p className="desc">
        日ごとの累積Started/Completed数とWIP数を表示。Started-Completedの差がWIP。二つの線が離れるほど仕掛かりが溜まっている
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="date" stroke="#8b949e" />
          <YAxis yAxisId="left" stroke="#8b949e" />
          <YAxis yAxisId="right" orientation="right" stroke="#8b949e" />
          <Tooltip
            contentStyle={{
              background: "#161b22",
              border: "1px solid #30363d",
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Started"
            stroke="#f0883e"
            isAnimationActive={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Completed"
            stroke="#3fb950"
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="WIP"
            stroke="#58a6ff"
            strokeDasharray="5 5"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
