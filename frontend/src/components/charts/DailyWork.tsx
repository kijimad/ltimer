import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { DailyWorkEntry } from "../../types/index.ts";
import { PALETTE } from "./colors.ts";

interface Props {
  dailyWork: DailyWorkEntry[];
}

export function DailyWork({ dailyWork }: Props) {
  const { chartData, taskNames } = useMemo(() => {
    const nameSet = new Set<string>();
    for (const entry of dailyWork) {
      for (const t of entry.tasks) nameSet.add(t.title);
    }
    const taskNames = Array.from(nameSet);

    const chartData = dailyWork.map((entry) => {
      const row: Record<string, string | number> = { date: entry.date };
      for (const t of entry.tasks) {
        row[t.title] = t.minutes;
      }
      return row;
    });

    return { chartData, taskNames };
  }, [dailyWork]);

  return (
    <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#A0AEC0" />
          <YAxis stroke="#A0AEC0" unit=" min" />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
            }}
          />
          <Legend />
          {taskNames.map((name, i) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="work"
              fill={PALETTE[i % PALETTE.length]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
  );
}
