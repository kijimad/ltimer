import type { Database, SqlValue } from "sql.js";
import type { TimeRange } from "../types/index.ts";
import type { GaugeMetric, Summary, TileMetric } from "../metrics.ts";
import { summaryPeriods, type Period } from "../metrics.ts";
import { rows } from "./database.ts";
import { TASK_METRICS, NOTE_METRICS, ACTIVITY_METRICS, FLOW_METRICS, ACTIVE_WIP_DAYS, series, evaluate, type MetricDef } from "./metricDefs.ts";

/** 1行1列の結果を返す SQL を期間ごとに評価する */
function scalar(db: Database, sql: string, params: SqlValue[]): number | null {
  const [row] = rows<{ v: number | null }>(db, sql, params);
  return row?.v ?? null;
}

function gauge(db: Database, periods: Period[], { sql, ...meta }: MetricDef): GaugeMetric {
  const [current, ...past] = series(db, { sql, ...meta }, periods);
  return { ...meta, value: current, history: past.filter((v): v is number => v !== null) };
}

function dataStart(db: Database, sql: string): string {
  return rows<{ v: string | null }>(db, sql)[0]?.v ?? "";
}

export function taskSummary(db: Database, asOf: string, range: TimeRange): Summary {
  const periods = summaryPeriods(range, asOf, dataStart(db, "SELECT min(substr(first_clock_in, 1, 10)) AS v FROM tasks_local"));

  const activeWip = evaluate(db, FLOW_METRICS.wip, { startedAt: asOf, finishedAt: asOf })!;
  // いつもの間隔 (DONE どうしの間隔の p90) を超えて何も終わっていなければ警告する
  const [done] = rows<{ last: string | null; p90: number | null; intervals: number }>(
    db,
    `WITH d AS (SELECT DISTINCT completed_date AS date FROM tasks_local WHERE status = 'DONE' AND completed_date <= ?1),
          i AS (SELECT julianday(date) - julianday(lag(date) OVER (ORDER BY date)) AS days FROM d)
     SELECT (SELECT max(date) FROM d) AS last,
            (SELECT percentile(days, 90) FROM i WHERE days IS NOT NULL) AS p90,
            (SELECT count(days) FROM i) AS intervals`,
    [asOf],
  );
  const tiles: TileMetric[] = [
    { key: "active-wip", label: FLOW_METRICS.wip.label, desc: `${ACTIVE_WIP_DAYS}日以内に CLOCK した TODO`, value: activeWip },
  ];
  if (done.last !== null) {
    const sinceLastDone = scalar(db, "SELECT CAST(julianday(?1) - julianday(?2) AS INTEGER) AS v", [asOf, done.last])!;
    tiles.push({
      key: "since-last-done",
      label: "最後の DONE から",
      desc: done.intervals > 0 ? `いつもの間隔 (p90) は ${done.p90}日` : "いつもの間隔はまだ測れない",
      value: sinceLastDone,
      unit: "日",
      alert: done.intervals > 0 && sinceLastDone > done.p90!,
    });
  }

  return {
    gauges: Object.values(TASK_METRICS).map((def) => gauge(db, periods, def)),
    tiles,
  };
}

export function noteSummary(db: Database, asOf: string, range: TimeRange): Summary {
  const periods = summaryPeriods(range, asOf, dataStart(db, "SELECT min(created) AS v FROM notes"));
  return {
    gauges: Object.values(NOTE_METRICS).map((def) => gauge(db, periods, def)),
    tiles: [],
  };
}

export function activitySummary(db: Database, asOf: string, range: TimeRange): Summary {
  const periods = summaryPeriods(range, asOf, dataStart(db, "SELECT min(date) AS v FROM activity_daily"));
  return {
    gauges: Object.values(ACTIVITY_METRICS).map((def) => gauge(db, periods, def)),
    tiles: [],
  };
}
