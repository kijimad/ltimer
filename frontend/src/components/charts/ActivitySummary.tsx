import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ActivityRepository } from "../../data/repository.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  repo: ActivityRepository;
  startedAt: string;
}

export function ActivitySummary({ repo, startedAt }: Props) {
  const data = useMemo(
    () =>
      repo.totals(startedAt)
        .map(({ title, minutes }) => ({ title, hours: Math.round((minutes / 60) * 10) / 10 }))
        .sort((a, b) => b.hours - a.hours),
    [repo, startedAt],
  );

  return (
    <ResponsiveContainer width="100%" height={Math.max(250, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 130 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis type="number" stroke={AXIS_STROKE} unit=" h" />
        <YAxis type="category" dataKey="title" stroke={AXIS_STROKE} width={120} tick={{ fontSize: 11 }} interval={0} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} h`, "累計時間"]} />
        <Bar dataKey="hours" fill="#58a6ff" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
