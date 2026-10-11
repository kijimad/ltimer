import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { TaskRepository } from "../../data/repository.ts";
import type { TimeUnit } from "../../types/index.ts";
import { shortName } from "../../hooks/usePeriodKey.ts";
import { PALETTE, GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  unit: TimeUnit;
}

export function ProjectMixChart({ repo, startedAt, unit }: Props) {
  const { data, projects } = useMemo(() => {
    const mix = repo.workByProject(startedAt, unit);
    // 週や月の合計は数千分になるので時間で表示する
    const data = mix.data.map((row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "number" ? Math.round((v / 60) * 10) / 10 : v])),
    );
    return { data, projects: mix.projects };
  }, [repo, startedAt, unit]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="period" stroke={AXIS_STROKE} />
        <YAxis stroke={AXIS_STROKE} unit=" h" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend />
        {projects.map((file, i) => (
          <Bar key={file} dataKey={file} name={shortName(file)} stackId="project" fill={PALETTE[i % PALETTE.length]} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
