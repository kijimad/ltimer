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
import type { TimeUnit } from "../../types/index.ts";
import type { TaskRepository } from "../../data/repository.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  unit: TimeUnit;
}

export function CfdChart({ repo, startedAt, unit }: Props) {
  const data = useMemo(() => repo.cumulativeFlow(startedAt, unit), [repo, startedAt, unit]);

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
