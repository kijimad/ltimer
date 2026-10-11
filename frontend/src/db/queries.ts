import type { Database } from "sql.js";
import type { WorkflowData, ActivityData, DraftData, Task, TaskClock, DraftEntry } from "../types/index.ts";
import { rows } from "./database.ts";

export function generatedAt(db: Database): string {
  return rows<{ value: string }>(db, "SELECT value FROM meta WHERE key = 'generated_at'")[0].value;
}

export function loadWorkflow(db: Database): WorkflowData {
  const clocks = new Map<number, TaskClock[]>();
  for (const c of rows<TaskClock & { task_id: number }>(db, "SELECT task_id, start, end, minutes FROM clocks_local ORDER BY start, seq")) {
    if (!clocks.has(c.task_id)) clocks.set(c.task_id, []);
    clocks.get(c.task_id)!.push({ start: c.start, end: c.end, minutes: c.minutes });
  }
  const tasks = rows<Omit<Task, "clocks"> & { id: number }>(
    db,
    `SELECT id, title, file, status, first_clock_in, last_clock_out, closed_at, lead_time_days, total_minutes, clock_count
     FROM tasks_local ORDER BY lead_time_days DESC, id`,
  ).map(({ id, ...t }) => ({ ...t, clocks: clocks.get(id)! }));

  const dailyWork = new Map<string, { title: string; minutes: number }[]>();
  for (const d of rows<{ date: string; title: string; minutes: number }>(db, "SELECT date, title, minutes FROM daily_work ORDER BY date, title")) {
    if (!dailyWork.has(d.date)) dailyWork.set(d.date, []);
    dailyWork.get(d.date)!.push({ title: d.title, minutes: d.minutes });
  }
  return {
    generated_at: generatedAt(db),
    tasks,
    daily_work: [...dailyWork].map(([date, tasks]) => ({ date, tasks })),
  };
}

export function loadActivity(db: Database): ActivityData {
  const daily = new Map<string, { title: string; minutes: number }[]>();
  for (const d of rows<{ date: string; title: string; minutes: number }>(db, "SELECT date, title, minutes FROM activity_daily ORDER BY date, title")) {
    if (!daily.has(d.date)) daily.set(d.date, []);
    daily.get(d.date)!.push({ title: d.title, minutes: d.minutes });
  }
  return { generated_at: generatedAt(db), daily: [...daily].map(([date, activities]) => ({ date, activities })) };
}

export function loadDraft(db: Database): DraftData {
  const entries = rows<DraftEntry>(
    db,
    "SELECT file, title, created, published, lead_time_days, status FROM drafts ORDER BY coalesce(lead_time_days, 0) DESC, rowid",
  );
  return { generated_at: generatedAt(db), entries };
}
