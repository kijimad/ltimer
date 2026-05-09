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
    <div className="card full">
      <h3>Daily Work</h3>
      <p className="desc">
        日ごとにどのタスクに何分投入したかをスタック棒グラフで表示。作業配分のばらつきやマルチタスクの度合いを確認できる
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="date" stroke="#8b949e" />
          <YAxis stroke="#8b949e" unit=" min" />
          <Tooltip
            contentStyle={{
              background: "#161b22",
              border: "1px solid #30363d",
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
    </div>
  );
}
