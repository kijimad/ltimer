import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Task, TimeUnit } from "../../types/index.ts";
import { interruptionsByPeriod } from "../../spans.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  tasks: Task[];
  unit: TimeUnit;
  startedAt: string;
}

export function InterruptionChart({ tasks, unit, startedAt }: Props) {
  const data = useMemo(() => interruptionsByPeriod(tasks, unit, startedAt), [tasks, unit, startedAt]);

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
