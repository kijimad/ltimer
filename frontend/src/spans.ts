import type { Task, TimeUnit } from "./types/index.ts";
import { minutesBetween } from "./dates.ts";
import { periodKey } from "./hooks/usePeriodKey.ts";

/** これ未満の間隔はポモドーロの休憩などとみなし、手を離した待ちと区別する */
export const RESUME_GAP_MINUTES = 60;

/** 前のセッションに含まれるセッションがあるので、それまでで最も遅い終了から測る。重なれば 0 */
export function sessionGaps(task: Task): { resumedAt: string; minutes: number }[] {
  let lastEnd = task.clocks[0]?.end;
  return task.clocks.slice(1).map((c) => {
    const minutes = Math.max(0, minutesBetween(lastEnd, c.start));
    if (c.end > lastEnd) lastEnd = c.end;
    return { resumedAt: c.start, minutes };
  });
}

/** 同じ日に別のタスクを挟んで戻ったセッション (A→B→A の2回目の A) を1回と数える。同名の別タスクは区別する */
export function interruptionsByDate(tasks: Task[]): Map<string, number> {
  const byDate = new Map<string, { start: string; task: Task }[]>();
  for (const task of tasks) {
    for (const c of task.clocks) {
      const date = c.start.slice(0, 10);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push({ start: c.start, task });
    }
  }
  const result = new Map<string, number>();
  for (const [date, sessions] of byDate) {
    const seq = sessions.sort((a, b) => (a.start < b.start ? -1 : 1)).map((s) => s.task);
    const count = seq.filter((task, i) => i > 0 && task !== seq[i - 1] && seq.slice(0, i - 1).includes(task)).length;
    result.set(date, count);
  }
  return result;
}

export function interruptionsByPeriod(tasks: Task[], unit: TimeUnit, startedAt: string): { period: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const [date, n] of interruptionsByDate(tasks)) {
    if (date < startedAt) continue;
    const pk = periodKey(date, unit);
    counts[pk] = (counts[pk] || 0) + n;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({ period, count }));
}

export const QUEUE_TIME_BUCKETS: { label: string; maxMinutes: number }[] = [
  { label: "<1h (休憩)", maxMinutes: RESUME_GAP_MINUTES },
  { label: "1-6h", maxMinutes: 6 * 60 },
  { label: "6-24h", maxMinutes: 24 * 60 },
  { label: "1-3d", maxMinutes: 3 * 24 * 60 },
  { label: "3-7d", maxMinutes: 7 * 24 * 60 },
  { label: "7-30d", maxMinutes: 30 * 24 * 60 },
  { label: ">30d", maxMinutes: Infinity },
];

export function queueTimeHistogram(tasks: Task[], startedAt: string): { bucket: string; count: number }[] {
  const counts = QUEUE_TIME_BUCKETS.map(() => 0);
  for (const g of tasks.flatMap(sessionGaps)) {
    if (g.resumedAt.slice(0, 10) < startedAt) continue;
    counts[QUEUE_TIME_BUCKETS.findIndex((b) => g.minutes < b.maxMinutes)]++;
  }
  return QUEUE_TIME_BUCKETS.map((b, i) => ({ bucket: b.label, count: counts[i] }));
}
