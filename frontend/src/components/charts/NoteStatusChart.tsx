import { useMemo } from "react";
import type { NoteRepository } from "../../data/repository.ts";
import type { TimeUnit } from "../../types/index.ts";
import { NOTE_STATUS } from "./colors.ts";
import { StackedPeriodChart } from "./StackedPeriodChart.tsx";

interface Props {
  repo: NoteRepository;
  startedAt: string;
  unit: TimeUnit;
}

const SERIES = (["draft", "published"] as const).map((key) => ({ key, ...NOTE_STATUS[key] }));

export function NoteStatusChart({ repo, startedAt, unit }: Props) {
  const data = useMemo(() => repo.createdByStatus(startedAt, unit), [repo, startedAt, unit]);
  return <StackedPeriodChart data={data} series={SERIES} integer />;
}
