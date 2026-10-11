import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Database } from "sql.js";
import type { TimeUnit } from "../../types/index.ts";
import { interruptionsByPeriod } from "../../db/charts.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  db: Database;
  startedAt: string;
  unit: TimeUnit;
}

export function InterruptionChart({ db, startedAt, unit }: Props) {
  const data = useMemo(() => interruptionsByPeriod(db, startedAt, unit), [db, startedAt, unit]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="period" stroke={AXIS_STROKE} />
        <YAxis stroke={AXIS_STROKE} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} 回`, "割り込み"]} />
        <Bar dataKey="count" fill="#a371f7" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
