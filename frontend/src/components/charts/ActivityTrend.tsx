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
import type { ActivityDailyEntry, TimeUnit } from "../../types/index.ts";
import { periodKey } from "../../hooks/usePeriodKey.ts";
import { PALETTE, GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  daily: ActivityDailyEntry[];
  unit: TimeUnit;
}

export function ActivityTrend({ daily, unit }: Props) {
  const { data, titles } = useMemo(() => {
    const byPeriod: Record<string, Record<string, number>> = {};
    const titleSet = new Set<string>();

    for (const d of daily) {
      const p = periodKey(d.date, unit);
      if (!byPeriod[p]) byPeriod[p] = {};
      for (const a of d.activities) {
        titleSet.add(a.title);
        byPeriod[p][a.title] = (byPeriod[p][a.title] || 0) + a.minutes;
      }
    }

    const titles = Array.from(titleSet).sort();
    const periods = Object.keys(byPeriod).sort();

    const data = periods.map((p) => {
      const row: Record<string, string | number> = { period: p };
      for (const t of titles) {
        row[t] = Math.round((byPeriod[p][t] || 0) / 60 * 10) / 10;
      }
      return row;
    });

    return { data, titles };
  }, [daily, unit]);

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
