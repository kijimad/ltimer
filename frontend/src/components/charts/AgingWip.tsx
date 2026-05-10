import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Task } from "../../types/index.ts";
import { AGING_THRESHOLD_DAYS, GRID_STROKE, AXIS_STROKE, TOOLTIP_DIV_STYLE } from "./colors.ts";

interface Props {
  tasks: Task[];
}

export function AgingWip({ tasks }: Props) {
  const data = useMemo(() => {
    const now = Date.now();
    return tasks
      .filter((t) => t.status === "TODO")
      .map((t) => {
        const days = Math.round((now - new Date(t.first_clock_in).getTime()) / (1000 * 60 * 60 * 24));
        return {
          title: t.title.slice(0, 25),
          days,
          fill: days > AGING_THRESHOLD_DAYS ? "#f85149" : "#f0883e",
        };
      })
      .sort((a, b) => b.days - a.days);
  }, [tasks]);

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis type="number" stroke={AXIS_STROKE} unit=" d" />
        <YAxis type="category" dataKey="title" stroke={AXIS_STROKE} width={110} tick={{ fontSize: 11 }} interval={0} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div style={TOOLTIP_DIV_STYLE}>
                <div>{d.title}</div>
                <div>{d.days} days</div>
              </div>
            );
          }}
        />
        <Bar dataKey="days" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
