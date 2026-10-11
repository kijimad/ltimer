import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Database } from "sql.js";
import type { TimeUnit } from "../../types/index.ts";
import { wipByPeriod } from "../../db/charts.ts";

interface Props {
  db: Database;
  startedAt: string;
  unit: TimeUnit;
}

export function WipTrend({ db, startedAt, unit }: Props) {
  const data = useMemo(() => wipByPeriod(db, startedAt, unit).map(({ period, wip }) => ({ period, wip })), [db, startedAt, unit]);

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
          <Line
            type="monotone"
            dataKey="wip"
            stroke="#58a6ff"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
  );
}
