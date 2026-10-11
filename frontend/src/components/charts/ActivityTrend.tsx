import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Database } from "sql.js";
import type { TimeUnit } from "../../types/index.ts";
import { activityByPeriod } from "../../db/charts.ts";
import { PALETTE, GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  db: Database;
  startedAt: string;
  unit: TimeUnit;
}

export function ActivityTrend({ db, startedAt, unit }: Props) {
  const { data, titles } = useMemo(() => {
    const cells = activityByPeriod(db, startedAt, unit);
    const titles = [...new Set(cells.map((c) => c.title))].sort();
    const periods = [...new Set(cells.map((c) => c.period))];
    const data = periods.map((p) => {
      const row: Record<string, string | number> = { period: p };
      for (const t of titles) {
        row[t] = Math.round((cells.find((c) => c.period === p && c.title === t)?.minutes ?? 0) / 60 * 10) / 10;
      }
      return row;
    });
    return { data, titles };
  }, [db, startedAt, unit]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="period" stroke={AXIS_STROKE} tick={{ fontSize: 11 }} />
        <YAxis stroke={AXIS_STROKE} unit=" h" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend />
        {titles.map((t, i) => (
          <Bar key={t} dataKey={t} stackId="a" fill={PALETTE[i % PALETTE.length]} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
