import { useMemo } from "react";
import type { TaskRepository } from "../../data/repository.ts";
import { BucketChart } from "./BucketChart.tsx";

interface Props {
  repo: TaskRepository;
  startedAt: string;
}

export function FocusBlockChart({ repo, startedAt }: Props) {
  const data = useMemo(() => repo.focusBlockHistogram(startedAt), [repo, startedAt]);
  return <BucketChart data={data} name="集中ブロック" unit="回" />;
}
