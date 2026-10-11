import type {
  RawWorkflowData, RawActivityData, RawClock, WorkflowData, ActivityData, Task, DailyWorkEntry, ActivityDailyEntry,
} from "./types/index.ts";
import { localDateTime, daysBetween } from "./dates.ts";

// UTC の時点を閲覧者タイムゾーンの壁時計時刻に変換する。以降のコードはタイムゾーンを意識しない

function byString(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sumByDate(items: { title: string; clocks: RawClock[] }[]): { date: string; entries: { title: string; minutes: number }[] }[] {
  const byDate = new Map<string, Map<string, number>>();
  for (const { title, clocks } of items) {
    for (const c of clocks) {
      const date = localDateTime(c.start).slice(0, 10);
      const titles = byDate.get(date) ?? new Map<string, number>();
      titles.set(title, (titles.get(title) ?? 0) + c.minutes);
      byDate.set(date, titles);
    }
  }
  return [...byDate.keys()].sort(byString).map((date) => ({
    date,
    entries: [...byDate.get(date)!.entries()]
      .sort(([a], [b]) => byString(a, b))
      .map(([title, minutes]) => ({ title, minutes })),
  }));
}

export function normalizeWorkflow(raw: RawWorkflowData): WorkflowData {
  const tasks: Task[] = raw.tasks
    .map((t) => {
      const firstClockIn = t.clocks.map((c) => localDateTime(c.start)).sort(byString)[0];
      const lastClockOut = t.clocks.map((c) => localDateTime(c.end)).sort(byString).at(-1)!;
      return {
        title: t.title,
        file: t.file,
        status: t.status,
        first_clock_in: firstClockIn,
        last_clock_out: lastClockOut,
        closed_at: t.closed_at === null ? null : localDateTime(t.closed_at),
        lead_time_days: daysBetween(firstClockIn.slice(0, 10), lastClockOut.slice(0, 10)),
        total_minutes: t.clocks.reduce((s, c) => s + c.minutes, 0),
        clock_count: t.clocks.length,
      };
    })
    // LeadTimeBar などは並び順をそのまま使うので、リードタイムの降順にしておく
    .sort((a, b) => b.lead_time_days - a.lead_time_days);

  const daily_work: DailyWorkEntry[] = sumByDate(raw.tasks).map((d) => ({ date: d.date, tasks: d.entries }));
  return { generated_at: raw.generated_at, tasks, daily_work };
}

export function normalizeActivity(raw: RawActivityData): ActivityData {
  const daily: ActivityDailyEntry[] = sumByDate(raw.activities).map((d) => ({ date: d.date, activities: d.entries }));
  return { generated_at: raw.generated_at, daily };
}
