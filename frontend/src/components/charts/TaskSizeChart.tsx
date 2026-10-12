import { useMemo } from "react";
import type { TaskRepository } from "../../data/repository.ts";
import { BucketChart } from "./BucketChart.tsx";

interface Props {
  repo: TaskRepository;
  startedAt: string;
}

export function TaskSizeChart({ repo, startedAt }: Props) {
  const data = useMemo(() => repo.taskSizeHistogram(startedAt), [repo, startedAt]);
  return <BucketChart data={data} name="DONE" unit="件" />;
}
