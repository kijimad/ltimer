import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TaskRepository } from "../../data/repository.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
}

export function FocusBlockChart({ repo, startedAt }: Props) {
  const data = useMemo(() => repo.focusBlockHistogram(startedAt), [repo, startedAt]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="bucket" stroke={AXIS_STROKE} />
        <YAxis stroke={AXIS_STROKE} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} 回`, "集中ブロック"]} />
        <Bar dataKey="count" fill="#58a6ff" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
