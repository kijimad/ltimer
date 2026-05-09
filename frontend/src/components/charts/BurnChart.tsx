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
    <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#A0AEC0" />
          <YAxis yAxisId="left" stroke="#A0AEC0" />
          <YAxis yAxisId="right" orientation="right" stroke="#A0AEC0" />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
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
  );
}
