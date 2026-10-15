// schema.sql と views.sql が作る表の列。列名と行の型は rows.test.ts で実際の表と突き合わせる
import type { Database, SqlValue } from "sql.js";

export const TABLES = {
  meta: ["key", "value"],
  tasks: ["id", "title", "file", "status", "closed_at", "effort_minutes", "deadline"],
  task_clocks: ["task_id", "start", "end", "minutes"],
  activity_clocks: ["title", "start", "end", "minutes"],
  notes: ["file", "title", "created", "published", "lead_time_days", "status"],
  note_tags: ["file", "tag"],
} as const;

/** 開いたときに閲覧者のタイムゾーンで作る一時テーブル */
export const LOCAL_TABLES = {
  clocks_local: ["seq", "task_id", "start", "end", "minutes"],
  tasks_local: ["id", "title", "file", "status", "first_clock_in", "last_clock_out", "closed_at", "lead_time_days", "total_minutes", "clock_count", "completed_date", "effort_minutes", "deadline"],
  daily_work: ["date", "title", "minutes"],
  activity_clocks_local: ["title", "start", "end", "minutes"],
  activity_daily: ["date", "title", "minutes"],
  session_gaps: ["task_id", "resumed_at", "minutes"],
  focus_blocks: ["task_id", "start", "end", "minutes", "sessions"],
  calendar: ["date", "week", "month", "weekday"],
  daily_task_facts: ["date", "started", "done", "closed", "work_minutes"],
} as const;

/** 時点は UTC の ISO 8601、日付は YYYY-MM-DD */
export interface Records {
  meta: { key: string; value: string };
  tasks: {
    id: number;
    title: string;
    file: string;
    status: "TODO" | "DONE" | "CLOSE";
    closed_at: string | null;
    effort_minutes: number | null;
    deadline: string | null;
  };
  task_clocks: { task_id: number; start: string; end: string; minutes: number };
  activity_clocks: { title: string; start: string; end: string; minutes: number };
  notes: {
    file: string;
    title: string;
    created: string;
    published: string | null;
    lead_time_days: number | null;
    status: "draft" | "published";
  };
  note_tags: { file: string; tag: string };
}

export type ClockRow = Omit<Records["task_clocks"], "task_id">;
/** パーサーが作るタスク。id は挿入するときに振る */
export type TaskRow = Omit<Records["tasks"], "id"> & { clocks: ClockRow[] };
export type NoteRow = Records["notes"] & { tags: string[] };

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
// 行の型と列の一覧のずれをコンパイル時に検出する
const columnsMatchRecords: { [T in keyof Records]: Equal<keyof Records[T], (typeof TABLES)[T][number]> } = {
  meta: true,
  tasks: true,
  task_clocks: true,
  activity_clocks: true,
  notes: true,
  note_tags: true,
};
void columnsMatchRecords;

/** 列と行の型の対応は columnsMatchRecords が保証するので、ここでは列名を文字列として扱う */
export function insert<T extends keyof Records>(db: Database, table: T, row: Records[T]): void {
  const columns: readonly string[] = TABLES[table];
  const values = row as unknown as Record<string, SqlValue>;
  db.run(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`, columns.map((c) => values[c]));
}
