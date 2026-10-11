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
import type { Database } from "sql.js";
import type { TimeUnit } from "../../types/index.ts";
import { throughputByPeriod } from "../../db/charts.ts";

interface Props {
  db: Database;
  startedAt: string;
  unit: TimeUnit;
}

export function ThroughputChart({ db, startedAt, unit }: Props) {
  const data = useMemo(() => throughputByPeriod(db, startedAt, unit), [db, startedAt, unit]);

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
