import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Database } from "sql.js";
import type { TimeUnit } from "../../types/index.ts";
import { netProfitByPeriod } from "../../db/charts.ts";

interface Props {
  db: Database;
  startedAt: string;
  unit: TimeUnit;
}

export function NetProfitTrend({ db, startedAt, unit }: Props) {
  const data = useMemo(() => netProfitByPeriod(db, startedAt, unit), [db, startedAt, unit]);

  return (
    <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" stroke="#A0AEC0" />
          <YAxis yAxisId="left" stroke="#A0AEC0" label={{ value: "Tasks", angle: -90, position: "insideLeft" }} />
          <YAxis yAxisId="right" orientation="right" stroke="#A0AEC0" label={{ value: "Hours", angle: 90, position: "insideRight" }} />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="Throughput"
            fill="#3fb950"
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="OE"
            stroke="#f85149"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
  );
}
