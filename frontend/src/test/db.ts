import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import schema from "../db/schema.sql?raw";
import { attachViews } from "../db/database.ts";
import type { RawTask, RawClock, DraftEntry, Task, ActivityDailyEntry } from "../types/index.ts";

const SQL = await initSqlJs({ locateFile: (f) => `node_modules/sql.js/dist/${f}` });

export interface TestData {
  generatedAt: string;
  tasks?: RawTask[];
  activities?: { title: string; clocks: RawClock[] }[];
  drafts?: DraftEntry[];
}

const utc = (local: string) => new Date(local.replace(" ", "T")).toISOString();

/** 表示用の Task を DB の行にする。clocks がなければ着手と最終作業の2点で作業時間を表す */
export function fromTasks(tasks: Task[]): RawTask[] {
  return tasks.map((t) => {
    const clocks = t.clocks.length > 0
      ? t.clocks
      : [{ start: t.first_clock_in, end: t.first_clock_in, minutes: t.total_minutes }, { start: t.last_clock_out, end: t.last_clock_out, minutes: 0 }];
    return {
      title: t.title,
      file: t.file,
      status: t.status,
      closed_at: t.closed_at && utc(t.closed_at),
      clocks: clocks.map((c) => ({ start: utc(c.start), end: utc(c.end), minutes: c.minutes })),
    };
  });
}

/** 日ごとの Activity を、その日の昼のセッションとして DB の行にする */
export function fromDaily(daily: ActivityDailyEntry[]): { title: string; clocks: RawClock[] }[] {
  return daily.flatMap((d) =>
    d.activities.map((a) => ({ title: a.title, clocks: [{ start: utc(`${d.date} 12:00`), end: utc(`${d.date} 12:30`), minutes: a.minutes }] })),
  );
}

/** 本番と同じ schema.sql から DB を作り、フィクスチャを入れる */
export function createTestDatabase({ generatedAt, tasks = [], activities = [], drafts = [] }: TestData): Database {
  const db = new SQL.Database();
  db.exec(schema);
  db.run("INSERT INTO meta VALUES ('generated_at', ?)", [generatedAt]);
  tasks.forEach((t, i) => {
    db.run("INSERT INTO tasks VALUES (?, ?, ?, ?, ?)", [i, t.title, t.file, t.status, t.closed_at]);
    for (const c of t.clocks) db.run("INSERT INTO task_clocks VALUES (?, ?, ?, ?)", [i, c.start, c.end, c.minutes]);
  });
  for (const a of activities) {
    for (const c of a.clocks) db.run("INSERT INTO activity_clocks VALUES (?, ?, ?, ?)", [a.title, c.start, c.end, c.minutes]);
  }
  for (const e of drafts) {
    db.run("INSERT INTO drafts VALUES (?, ?, ?, ?, ?, ?)", [e.file, e.title, e.created, e.published, e.lead_time_days, e.status]);
  }
  return attachViews(db);
}
