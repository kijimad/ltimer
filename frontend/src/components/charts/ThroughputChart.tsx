import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { TimeUnit } from "../../types/index.ts";
import type { TaskRepository } from "../../data/repository.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  unit: TimeUnit;
}

export function ThroughputChart({ repo, startedAt, unit }: Props) {
  const data = useMemo(() => repo.throughputByPeriod(startedAt, unit), [repo, startedAt, unit]);

  return (
    <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" stroke="#A0AEC0" />
          <YAxis stroke="#A0AEC0" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
            }}
          />
          <Bar
            dataKey="count"
            fill="#3fb950"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
  );
}
