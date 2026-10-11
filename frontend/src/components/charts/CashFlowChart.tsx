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
import type { Database } from "sql.js";
import type { TimeUnit } from "../../types/index.ts";
import { cashFlowByPeriod } from "../../db/charts.ts";

interface Props {
  db: Database;
  startedAt: string;
  unit: TimeUnit;
}

export function CashFlowChart({ db, startedAt, unit }: Props) {
  const data = useMemo(() => cashFlowByPeriod(db, startedAt, unit), [db, startedAt, unit]);

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
