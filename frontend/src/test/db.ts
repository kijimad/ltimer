import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import schema from "../db/schema.sql?raw";
import { attachViews } from "../db/database.ts";
import { createSqlRepository } from "../db/sqlRepository.ts";
import type { Repository } from "../data/repository.ts";
import type { Task, ActivityDailyEntry } from "../types/index.ts";
import { insert, type TaskRow, type ClockRow, type DraftRow } from "../db/rows.ts";

const SQL = await initSqlJs({ locateFile: (f) => `node_modules/sql.js/dist/${f}` });

export interface TestData {
  generatedAt: string;
  tasks?: TaskRow[];
  activities?: { title: string; clocks: ClockRow[] }[];
  drafts?: DraftRow[];
}

const utc = (local: string) => new Date(local.replace(" ", "T")).toISOString();

/** 表示用の Task を DB の行にする。clocks がなければ着手と最終作業の2点で作業時間を表す */
export function fromTasks(tasks: (Task & Partial<Pick<TaskRow, "effort_minutes" | "deadline">>)[]): TaskRow[] {
  return tasks.map((t) => {
    const clocks = t.clocks.length > 0
      ? t.clocks
      : [{ start: t.first_clock_in, end: t.first_clock_in, minutes: t.total_minutes }, { start: t.last_clock_out, end: t.last_clock_out, minutes: 0 }];
    return {
      title: t.title,
      file: t.file,
      status: t.status,
      closed_at: t.closed_at && utc(t.closed_at),
      effort_minutes: t.effort_minutes ?? null,
      deadline: t.deadline ?? null,
      clocks: clocks.map((c) => ({ start: utc(c.start), end: utc(c.end), minutes: c.minutes })),
    };
  });
}

/** 日ごとの Activity を、その日の昼のセッションとして DB の行にする */
export function fromDaily(daily: ActivityDailyEntry[]): { title: string; clocks: ClockRow[] }[] {
  return daily.flatMap((d) =>
    d.activities.map((a) => ({ title: a.title, clocks: [{ start: utc(`${d.date} 12:00`), end: utc(`${d.date} 12:30`), minutes: a.minutes }] })),
  );
}

/** 本番と同じ schema.sql から DB を作り、フィクスチャを入れる */
export function createTestDatabase({ generatedAt, tasks = [], activities = [], drafts = [] }: TestData): Database {
  const db = new SQL.Database();
  db.exec(schema);
  insert(db, "meta", { key: "generated_at", value: generatedAt });
  tasks.forEach(({ clocks, ...t }, id) => {
    insert(db, "tasks", { id, ...t });
    for (const c of clocks) insert(db, "task_clocks", { task_id: id, ...c });
  });
  for (const a of activities) {
    for (const c of a.clocks) insert(db, "activity_clocks", { title: a.title, ...c });
  }
  for (const d of drafts) insert(db, "drafts", d);
  return attachViews(db);
}

export function createTestRepository(data: TestData): Repository {
  return createSqlRepository(createTestDatabase(data));
}
