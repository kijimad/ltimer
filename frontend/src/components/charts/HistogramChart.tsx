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
import type { TimeUnit } from "../../types/index.ts";
import type { TaskRepository } from "../../data/repository.ts";

const BIN_COLORS = ["#58a6ff", "#3fb950", "#f0883e", "#f85149", "#bc8cff", "#79c0ff", "#d2a8ff", "#56d364"];

interface Props {
  repo: TaskRepository;
  startedAt: string;
  unit: TimeUnit;
}

export function HistogramChart({ repo, startedAt, unit }: Props) {
  const { data, bins } = useMemo(() => repo.leadTimeHistogram(startedAt, unit), [repo, startedAt, unit]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#A0AEC0" />
        <YAxis stroke="#A0AEC0" allowDecimals={false} />
        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0" }} />
        <Legend />
        {bins.map((bin, i) => (
          <Bar
            key={bin}
            dataKey={bin}
            name={bin}
            fill={BIN_COLORS[i % BIN_COLORS.length]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
