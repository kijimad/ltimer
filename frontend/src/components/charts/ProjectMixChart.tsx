import { useMemo } from "react";
import type { TaskRepository } from "../../data/repository.ts";
import type { TimeUnit } from "../../types/index.ts";
import { shortName } from "../../hooks/usePeriodKey.ts";
import { PALETTE } from "./colors.ts";
import { StackedPeriodChart } from "./StackedPeriodChart.tsx";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  unit: TimeUnit;
}

export function ProjectMixChart({ repo, startedAt, unit }: Props) {
  const { data, series } = useMemo(() => {
    const mix = repo.workByProject(startedAt, unit);
    // 週や月の合計は数千分になるので時間で表示する
    const data = mix.data.map((row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "number" ? Math.round((v / 60) * 10) / 10 : v])),
    );
    return { data, series: mix.projects.map((file, i) => ({ key: file, name: shortName(file), color: PALETTE[i % PALETTE.length] })) };
  }, [repo, startedAt, unit]);

  return <StackedPeriodChart data={data} series={series} unit=" h" />;
}
