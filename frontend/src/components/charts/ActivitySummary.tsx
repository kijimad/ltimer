import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ActivityDailyEntry } from "../../types/index.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  daily: ActivityDailyEntry[];
}

export function ActivitySummary({ daily }: Props) {
  const data = useMemo(() => {
    const byTitle: Record<string, number> = {};
    for (const d of daily) {
      for (const a of d.activities) {
        byTitle[a.title] = (byTitle[a.title] || 0) + a.minutes;
      }
    }
    return Object.entries(byTitle)
      .map(([title, minutes]) => ({ title, hours: Math.round((minutes / 60) * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours);
  }, [daily]);

  return (
    <ResponsiveContainer width="100%" height={Math.max(250, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 130 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis type="number" stroke={AXIS_STROKE} unit=" h" />
        <YAxis type="category" dataKey="title" stroke={AXIS_STROKE} width={120} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} h`, "累計時間"]} />
        <Bar dataKey="hours" fill="#58a6ff" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
