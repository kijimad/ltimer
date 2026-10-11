import type { Database, SqlJsStatic, SqlValue } from "sql.js";
import views from "./views.sql?raw";
import { localDateTime } from "../dates.ts";

/** metrics.ts と同じ nearest-rank のパーセンタイル */
function nearestRank(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

/** 実行時には存在するが @types/sql.js に定義がない */
type WithAggregate = Database & {
  create_aggregate<S>(
    name: string,
    functions: { init: () => S; step: (state: S, value: number | null, p: number) => S; finalize: (state: S) => SqlValue },
  ): Database;
};

/** 閲覧者のタイムゾーンに依存する関数とビューを登録する */
export function attachViews(db: Database): Database {
  db.create_function("local_time", (utc: string | null) => (utc === null ? null : localDateTime(utc)));
  (db as WithAggregate).create_aggregate<{ values: number[]; p: number }>("percentile", {
    init: () => ({ values: [], p: 50 }),
    step: (state, value, p) => {
      if (value !== null) state.values.push(value);
      state.p = p;
      return state;
    },
    finalize: (state) => nearestRank(state.values, state.p),
  });
  db.exec(views);
  return db;
}

export function openDatabase(SQL: SqlJsStatic, bytes: Uint8Array): Database {
  return attachViews(new SQL.Database(bytes));
}

export function rows<T>(db: Database, sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result: T[] = [];
  while (stmt.step()) result.push(stmt.getAsObject() as T);
  stmt.free();
  return result;
}
