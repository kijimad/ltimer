import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import schema from "../db/schema.sql?raw";
import { attachViews } from "../db/database.ts";
import type { RawTask, RawClock, DraftEntry } from "../types/index.ts";

const SQL = await initSqlJs({ locateFile: (f) => `node_modules/sql.js/dist/${f}` });

export interface TestData {
  generatedAt: string;
  tasks?: RawTask[];
  activities?: { title: string; clocks: RawClock[] }[];
  drafts?: DraftEntry[];
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
