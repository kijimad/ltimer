import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { TimeUnit } from "../../types/index.ts";
import type { TaskRepository } from "../../data/repository.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  unit: TimeUnit;
}

export function CashFlowChart({ repo, startedAt, unit }: Props) {
  const data = useMemo(() => repo.cashFlowByPeriod(startedAt, unit), [repo, startedAt, unit]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#A0AEC0" />
        <YAxis stroke="#A0AEC0" />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e2e8f0",
          }}
        />
        <ReferenceLine y={0} stroke="#CBD5E0" />
        <Line
          type="monotone"
          dataKey="CashFlow"
          stroke="#3fb950"
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
