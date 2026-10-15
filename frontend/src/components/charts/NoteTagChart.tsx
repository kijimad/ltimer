import { useMemo } from "react";
import type { NoteRepository } from "../../data/repository.ts";
import type { TimeUnit } from "../../types/index.ts";
import { PALETTE, NOTE_STATUS } from "./colors.ts";
import { StackedPeriodChart } from "./StackedPeriodChart.tsx";

interface Props {
  repo: NoteRepository;
  startedAt: string;
  unit: TimeUnit;
}

// 公開状態の色と見分けられるようにする
const STATUS_COLORS: string[] = Object.values(NOTE_STATUS).map((s) => s.color);
const TAG_COLORS = PALETTE.filter((c) => !STATUS_COLORS.includes(c));

export function NoteTagChart({ repo, startedAt, unit }: Props) {
  const { data, series } = useMemo(() => {
    const { data, tags } = repo.createdByTag(startedAt, unit);
    return { data, series: tags.map((tag, i) => ({ ...tag, color: TAG_COLORS[i % TAG_COLORS.length] })) };
  }, [repo, startedAt, unit]);
  return <StackedPeriodChart data={data} series={series} integer />;
}
