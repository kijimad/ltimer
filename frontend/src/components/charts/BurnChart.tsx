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
import type { Database } from "sql.js";
import { burnByDate } from "../../db/charts.ts";

interface Props {
  db: Database;
  startedAt: string;
}

export function BurnChart({ db, startedAt }: Props) {
  const data = useMemo(() => burnByDate(db, startedAt), [db, startedAt]);

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
