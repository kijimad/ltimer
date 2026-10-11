import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Task } from "../../types/index.ts";
import { queueTimeHistogram } from "../../spans.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  tasks: Task[];
  startedAt: string;
}

export function QueueTimeChart({ tasks, startedAt }: Props) {
  const data = useMemo(() => queueTimeHistogram(tasks, startedAt), [tasks, startedAt]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="bucket" stroke={AXIS_STROKE} />
        <YAxis stroke={AXIS_STROKE} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} 回`, "再開"]} />
        <Bar dataKey="count" isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? AXIS_STROKE : "#f0883e"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
