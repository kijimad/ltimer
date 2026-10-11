import type { Database, SqlValue } from "sql.js";
import type { Task, TaskClock, TimeUnit, DailyWorkEntry, DraftEntry } from "../types/index.ts";
import { rows } from "./database.ts";
import { RESUME_GAP_MINUTES } from "./summary.ts";

/** 週は ISO の月曜、月は YYYY-MM。日付 (YYYY-MM-DD) にも日時 (YYYY-MM-DD HH:MM) にも使える */
function period(expr: string, unit: TimeUnit): string {
  return unit === "month" ? `substr(${expr}, 1, 7)` : `date(${expr}, '-6 days', 'weekday 1')`;
}

/** Tasks ページの対象: 範囲内 (?1 以降) に触ったタスク。並びは表示の基準 (リードタイムの降順) */
const FT = `ft AS (
  SELECT *, row_number() OVER (ORDER BY lead_time_days DESC, id) AS ord FROM tasks_local
  WHERE substr(last_clock_out, 1, 10) >= ?1 OR substr(first_clock_in, 1, 10) >= ?1
)`;

const q = <T>(db: Database, sql: string, params: SqlValue[]) => rows<T>(db, sql, params);

// --- タスク一覧 ---

export function tasksInRange(db: Database, startedAt: string): Task[] {
  const clocks = new Map<number, TaskClock[]>();
  for (const c of q<TaskClock & { task_id: number }>(
    db,
    `WITH ${FT} SELECT c.task_id, c.start, c.end, c.minutes FROM clocks_local c JOIN ft ON ft.id = c.task_id ORDER BY c.start, c.seq`,
    [startedAt],
  )) {
    if (!clocks.has(c.task_id)) clocks.set(c.task_id, []);
    clocks.get(c.task_id)!.push({ start: c.start, end: c.end, minutes: c.minutes });
  }
  return q<Omit<Task, "clocks"> & { id: number }>(
    db,
    `WITH ${FT} SELECT id, title, file, status, first_clock_in, last_clock_out, closed_at, lead_time_days, total_minutes, clock_count
     FROM ft ORDER BY ord`,
    [startedAt],
  ).map(({ id, ...t }) => ({ ...t, clocks: clocks.get(id)! }));
}

export function agingTodos(db: Database, startedAt: string, asOf: string): { title: string; days: number }[] {
  return q(
    db,
    `WITH ${FT}
     SELECT title, CAST(julianday(?2) - julianday(substr(first_clock_in, 1, 10)) AS INTEGER) AS days
     FROM ft WHERE status = 'TODO' ORDER BY days DESC, ord`,
    [startedAt, asOf],
  );
}

export function alertTodos(db: Database, startedAt: string, thresholdDays: number): Pick<Task, "title" | "file" | "lead_time_days">[] {
  return q(
    db,
    `WITH ${FT} SELECT title, file, lead_time_days FROM ft WHERE status = 'TODO' AND lead_time_days > ?2 ORDER BY lead_time_days DESC, ord`,
    [startedAt, thresholdDays],
  );
}

export interface FileSummaryRow {
  file: string;
  total: number;
  todo: number;
  done: number;
  close: number;
  work: number;
  avgLead: number;
  maxLead: number;
}

export function fileSummary(db: Database, startedAt: string): FileSummaryRow[] {
  return q(
    db,
    `WITH ${FT}
     SELECT file, count(*) AS total, sum(status = 'TODO') AS todo, sum(status = 'DONE') AS done, sum(status = 'CLOSE') AS close,
       sum(total_minutes) AS work, avg(lead_time_days) AS avgLead, max(lead_time_days) AS maxLead
     FROM ft GROUP BY file ORDER BY min(ord)`,
    [startedAt],
  );
}

// --- 期間ごとの集計 ---

export function throughputByPeriod(db: Database, startedAt: string, unit: TimeUnit): { period: string; count: number }[] {
  return q(
    db,
    `WITH ${FT}
     SELECT ${period("completed_date", unit)} AS period, count(*) AS count
     FROM ft WHERE status = 'DONE' AND completed_date IS NOT NULL GROUP BY period ORDER BY period`,
    [startedAt],
  );
}

export function leadTimePercentiles(db: Database, startedAt: string, unit: TimeUnit) {
  const data = q<{ period: string; p50: number; p85: number; p95: number }>(
    db,
    `WITH ${FT}
     SELECT ${period("completed_date", unit)} AS period,
       percentile(lead_time_days, 50) AS p50, percentile(lead_time_days, 85) AS p85, percentile(lead_time_days, 95) AS p95
     FROM ft WHERE status = 'DONE' AND completed_date IS NOT NULL GROUP BY period ORDER BY period`,
    [startedAt],
  );
  const [overall] = q<{ p85: number | null }>(
    db,
    `WITH ${FT} SELECT percentile(lead_time_days, 85) AS p85 FROM ft WHERE status = 'DONE'`,
    [startedAt],
  );
  return { data, globalP85: overall.p85 ?? 0 };
}

/** ビンの幅は全体の最大値を6分割した値。期間ごとに、出現したビンすべての件数を並べる */
export function leadTimeHistogram(db: Database, startedAt: string, unit: TimeUnit) {
  const DONE = `WITH ${FT} SELECT ${period("completed_date", unit)} AS period, lead_time_days AS v FROM ft WHERE status = 'DONE' AND completed_date IS NOT NULL`;
  const [{ max }] = q<{ max: number | null }>(db, `SELECT max(v) AS max FROM (${DONE})`, [startedAt]);
  if (max === null) return { data: [], bins: [] as string[] };
  const binSize = Math.max(1, Math.ceil(max / 6));
  const counts = q<{ period: string; bin: number; n: number }>(
    db,
    `SELECT period, (v / ?2) * ?2 AS bin, count(*) AS n FROM (${DONE}) GROUP BY period, bin ORDER BY period, bin`,
    [startedAt, binSize],
  );
  const sortedBins = [...new Set(counts.map((c) => c.bin))].sort((a, b) => a - b);
  const label = (b: number) => `${b}–${b + binSize}d`;
  const periods = [...new Set(counts.map((c) => c.period))];
  const data = periods.map((p) => {
    const row: Record<string, string | number> = { period: p };
    for (const b of sortedBins) row[label(b)] = counts.find((c) => c.period === p && c.bin === b)?.n ?? 0;
    return row;
  });
  return { data, bins: sortedBins.map(label) };
}

/**
 * 各期間の WIP (開始済みで未完了) と完了数・平均リードタイム。
 * 期間は対象タスクの開始と完了の期間の和集合で、?1 の期間以降だけを返す
 */
export function wipByPeriod(db: Database, startedAt: string, unit: TimeUnit) {
  return q<{ period: string; wip: number; throughput: number; avgLead: number | null }>(
    db,
    `WITH ${FT},
     r AS (
       SELECT ${period("first_clock_in", unit)} AS s,
         CASE WHEN completed_date IS NULL THEN '9999' ELSE ${period("completed_date", unit)} END AS e,
         status, completed_date, lead_time_days
       FROM ft
     ),
     ps AS (SELECT s AS p FROM r UNION SELECT e FROM r WHERE e <> '9999')
     SELECT p AS period,
       (SELECT count(*) FROM r WHERE s <= p AND p < e) AS wip,
       (SELECT count(*) FROM r WHERE status = 'DONE' AND completed_date IS NOT NULL AND e = p) AS throughput,
       (SELECT avg(lead_time_days) FROM r WHERE status = 'DONE' AND completed_date IS NOT NULL AND e = p) AS avgLead
     FROM ps WHERE p >= ${period("?1", unit)} ORDER BY p`,
    [startedAt],
  );
}

/** 期間ごとの開始・完了・CLOSE の累積。累積は対象タスクの全期間から数え、?1 の期間以降だけを返す */
export function cumulativeFlow(db: Database, startedAt: string, unit: TimeUnit) {
  return q<{ period: string; Started: number; Completed: number; Closed: number }>(
    db,
    `WITH ${FT},
     ev AS (
       SELECT ${period("first_clock_in", unit)} AS p, 1 AS st, 0 AS co, 0 AS cl FROM ft
       UNION ALL
       SELECT ${period("completed_date", unit)}, 0, 1, status = 'CLOSE' FROM ft WHERE completed_date IS NOT NULL
     ),
     cum AS (
       SELECT p, sum(sum(st)) OVER w AS Started, sum(sum(co)) OVER w AS Completed, sum(sum(cl)) OVER w AS Closed
       FROM ev GROUP BY p WINDOW w AS (ORDER BY p)
     )
     SELECT p AS period, Started, Completed, Closed FROM cum WHERE p >= ${period("?1", unit)} ORDER BY p`,
    [startedAt],
  );
}

export function burnByDate(db: Database, startedAt: string) {
  return q<{ date: string; Started: number; Completed: number; WIP: number }>(
    db,
    `WITH ${FT},
     ev AS (
       SELECT substr(first_clock_in, 1, 10) AS d, 1 AS st, 0 AS co FROM ft
       UNION ALL
       SELECT completed_date, 0, 1 FROM ft WHERE completed_date IS NOT NULL
     ),
     cum AS (SELECT d, sum(sum(st)) OVER w AS Started, sum(sum(co)) OVER w AS Completed FROM ev GROUP BY d WINDOW w AS (ORDER BY d))
     SELECT d AS date, Started, Completed, Started - Completed AS WIP FROM cum WHERE d >= ?1 ORDER BY d`,
    [startedAt],
  );
}

export function cashFlowByPeriod(db: Database, startedAt: string, unit: TimeUnit) {
  return q<{ period: string; CashFlow: number }>(
    db,
    `WITH ${FT},
     ev AS (
       SELECT ${period("first_clock_in", unit)} AS p, -1 AS net FROM ft
       UNION ALL
       SELECT ${period("completed_date", unit)}, 1 FROM ft WHERE completed_date IS NOT NULL
     ),
     cum AS (SELECT p, sum(sum(net)) OVER (ORDER BY p) AS CashFlow FROM ev GROUP BY p)
     SELECT p AS period, CashFlow FROM cum WHERE p >= ${period("?1", unit)} ORDER BY p`,
    [startedAt],
  );
}

/** 完了数 (T) と、日ごとに時間へ丸めた作業時間の期間合計 (OE) */
export function netProfitByPeriod(db: Database, startedAt: string, unit: TimeUnit) {
  const throughput = new Map(throughputByPeriod(db, startedAt, unit).map((r) => [r.period, r.count]));
  const oe = new Map<string, number>();
  for (const d of q<{ period: string; minutes: number }>(
    db,
    `SELECT ${period("date", unit)} AS period, sum(minutes) AS minutes FROM daily_work WHERE date >= ?1 GROUP BY date ORDER BY date`,
    [startedAt],
  )) {
    oe.set(d.period, (oe.get(d.period) ?? 0) + Math.round((d.minutes / 60) * 10) / 10);
  }
  return [...new Set([...throughput.keys(), ...oe.keys()])]
    .sort()
    .map((p) => ({ period: p, Throughput: throughput.get(p) ?? 0, OE: oe.get(p) ?? 0 }));
}

export function dailyWorkInRange(db: Database, startedAt: string): DailyWorkEntry[] {
  const byDate = new Map<string, { title: string; minutes: number }[]>();
  for (const d of q<{ date: string; title: string; minutes: number }>(
    db,
    "SELECT date, title, minutes FROM daily_work WHERE date >= ?1 ORDER BY date, title",
    [startedAt],
  )) {
    if (!byDate.has(d.date)) byDate.set(d.date, []);
    byDate.get(d.date)!.push({ title: d.title, minutes: d.minutes });
  }
  return [...byDate].map(([date, tasks]) => ({ date, tasks }));
}

// --- セッション ---

export const QUEUE_TIME_BUCKETS: { label: string; maxMinutes: number }[] = [
  { label: "<1h (休憩)", maxMinutes: RESUME_GAP_MINUTES },
  { label: "1-6h", maxMinutes: 6 * 60 },
  { label: "6-24h", maxMinutes: 24 * 60 },
  { label: "1-3d", maxMinutes: 3 * 24 * 60 },
  { label: "3-7d", maxMinutes: 7 * 24 * 60 },
  { label: "7-30d", maxMinutes: 30 * 24 * 60 },
  { label: ">30d", maxMinutes: Infinity },
];

export function queueTimeHistogram(db: Database, startedAt: string): { bucket: string; count: number }[] {
  const finite = QUEUE_TIME_BUCKETS.slice(0, -1);
  const bucket = `CASE ${finite.map((b, i) => `WHEN minutes < ${b.maxMinutes} THEN ${i}`).join(" ")} ELSE ${finite.length} END`;
  const counts = new Map(
    q<{ b: number; n: number }>(
      db,
      `SELECT ${bucket} AS b, count(*) AS n FROM session_gaps WHERE substr(resumed_at, 1, 10) >= ?1 GROUP BY b`,
      [startedAt],
    ).map((r) => [r.b, r.n]),
  );
  return QUEUE_TIME_BUCKETS.map((b, i) => ({ bucket: b.label, count: counts.get(i) ?? 0 }));
}

/** 同じ日に別のタスクを挟んで戻ったセッション (A→B→A の2回目の A) を1回と数える。同名の別タスクは区別する */
export function interruptionsByPeriod(db: Database, startedAt: string, unit: TimeUnit): { period: string; count: number }[] {
  return q(
    db,
    `WITH s AS (
       SELECT substr(start, 1, 10) AS d, task_id,
         row_number() OVER (PARTITION BY substr(start, 1, 10) ORDER BY start, seq) AS i,
         lag(task_id) OVER (PARTITION BY substr(start, 1, 10) ORDER BY start, seq) AS prev
       FROM clocks_local
     ),
     daily AS (
       SELECT d, sum(prev IS NOT NULL AND task_id <> prev
         AND EXISTS (SELECT 1 FROM s e WHERE e.d = s.d AND e.task_id = s.task_id AND e.i < s.i - 1)) AS n
       FROM s GROUP BY d
     )
     SELECT ${period("d", unit)} AS period, sum(n) AS count FROM daily WHERE d >= ?1 GROUP BY period ORDER BY period`,
    [startedAt],
  );
}

// --- Activity ---

/** 並びは初めて現れた順 (日付、同じ日はタイトル順) */
export function activityTotals(db: Database, startedAt: string): { title: string; minutes: number }[] {
  return q(
    db,
    `SELECT title, sum(minutes) AS minutes FROM activity_daily WHERE date >= ?1 GROUP BY title ORDER BY min(date), title`,
    [startedAt],
  );
}

export function activityByPeriod(db: Database, startedAt: string, unit: TimeUnit): { period: string; title: string; minutes: number }[] {
  return q(
    db,
    `SELECT ${period("date", unit)} AS period, title, sum(minutes) AS minutes
     FROM activity_daily WHERE date >= ?1 GROUP BY period, title ORDER BY period, title`,
    [startedAt],
  );
}

export function activityMinutesByDate(db: Database, startedAt: string): { date: string; minutes: number }[] {
  return q(
    db,
    "SELECT date, sum(minutes) AS minutes FROM activity_daily WHERE date >= ?1 GROUP BY date ORDER BY date",
    [startedAt],
  );
}

/**
 * Activity ごとの最長・現在のストリークと実施率。連続する日の島を「日付 - 島内の順番」で見分ける。
 * 当日か前日に実施していればストリーク継続中とみなす
 */
export function activityStreaks(db: Database, startedAt: string, asOf: string) {
  return q<{ title: string; current: number; max: number; recentDays: number; rate: number }>(
    db,
    `WITH a AS (SELECT DISTINCT title, date FROM activity_daily WHERE date >= ?1),
     isl AS (SELECT title, date, julianday(date) - row_number() OVER (PARTITION BY title ORDER BY date) AS g FROM a),
     runs AS (SELECT title, g, count(*) AS len, max(date) AS last FROM isl GROUP BY title, g),
     per AS (
       SELECT title, max(len) AS max,
         (SELECT r2.len FROM runs r2 WHERE r2.title = runs.title ORDER BY r2.last DESC LIMIT 1) AS lastLen,
         max(last) AS lastDate
       FROM runs GROUP BY title
     ),
     total AS (SELECT count(DISTINCT date) AS n FROM activity_daily WHERE date >= ?1)
     SELECT per.title,
       CASE WHEN julianday(?2) - julianday(per.lastDate) <= 1 THEN per.lastLen ELSE 0 END AS current,
       per.max,
       (SELECT count(*) FROM a WHERE a.title = per.title) AS recentDays,
       CASE WHEN total.n > 0 THEN (SELECT count(*) FROM a WHERE a.title = per.title) * 100.0 / total.n ELSE 0 END AS rate
     FROM per, total
     ORDER BY (SELECT min(date) FROM a WHERE a.title = per.title), per.title`,
    [startedAt, asOf],
  );
}

// --- Draft ---

/** 範囲内に作成または公開された記事 */
export function draftsInRange(db: Database, startedAt: string): DraftEntry[] {
  return q(
    db,
    `SELECT file, title, created, published, lead_time_days, status FROM drafts
     WHERE created >= ?1 OR published >= ?1 ORDER BY coalesce(lead_time_days, 0) DESC, rowid`,
    [startedAt],
  );
}

export function draftAges(db: Database, startedAt: string, asOf: string): { title: string; file: string; days: number }[] {
  return q(
    db,
    `SELECT title, file, CAST(julianday(?2) - julianday(created) AS INTEGER) AS days FROM drafts
     WHERE status = 'draft' AND (created >= ?1 OR published >= ?1)
     ORDER BY days DESC, coalesce(lead_time_days, 0) DESC, rowid`,
    [startedAt, asOf],
  );
}
