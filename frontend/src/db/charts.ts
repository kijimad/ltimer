import type { Database, SqlValue } from "sql.js";
import type { Task, TaskClock, TimeUnit, DailyWorkEntry, NoteEntry } from "../types/index.ts";
import { rows } from "./database.ts";
import { daysBetween } from "../dates.ts";
import { RESUME_GAP_MINUTES, TASK_METRICS, FLOW_METRICS, leadTimePercentile, series, evaluate, calendarPeriods } from "./metricDefs.ts";
import type { FileSummaryRow, NotesByStatus, NoteTagSeries, WeekdayHourMinutes, LeadTimePace, LeadTimePercentiles, LeadTimeHistogram, WipPoint, FlowPoint, BurnPoint, CashFlowPoint, NetProfitPoint, Streak } from "../data/repository.ts";

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

/** ActionableAgile のペースと同じく、10件未満では分布とみなさない */
const MIN_PACE_SAMPLES = 10;

export function leadTimePace(db: Database, asOf: string): LeadTimePace | null {
  const all = { startedAt: "0000-01-01", finishedAt: asOf };
  if ((evaluate(db, TASK_METRICS.throughput, all) ?? 0) < MIN_PACE_SAMPLES) return null;
  const [p50, p70, p85, p95] = [50, 70, 85, 95].map((p) => evaluate(db, leadTimePercentile(p), all)!);
  return { p50, p70, p85, p95 };
}

/** 経過日数は Aging WIP と同じく、最初の CLOCK から asOf まで */
export function alertTodos(db: Database, startedAt: string, asOf: string, thresholdDays: number): { title: string; file: string; days: number }[] {
  return q(
    db,
    `WITH ${FT}
     SELECT title, file, days FROM (
       SELECT title, file, ord, CAST(julianday(?2) - julianday(substr(first_clock_in, 1, 10)) AS INTEGER) AS days FROM ft WHERE status = 'TODO'
     ) WHERE days > ?3 ORDER BY days DESC, ord`,
    [startedAt, asOf, thresholdDays],
  );
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

/** 暦の週・月 */
const calendarPeriod = (unit: TimeUnit) => (unit === "month" ? "c.month" : "c.week");

/** 範囲内に完了した DONE の数。完了のない期間も 0 で返す */
export function throughputByPeriod(db: Database, startedAt: string, unit: TimeUnit): { period: string; count: number }[] {
  const periods = calendarPeriods(db, startedAt, unit);
  return series(db, TASK_METRICS.throughput, periods).map((v, i) => ({ period: periods[i].period, count: v ?? 0 }));
}

/** DONE のない期間は値を null にして、線を途切れさせる */
export function leadTimePercentiles(db: Database, startedAt: string, asOf: string, unit: TimeUnit): LeadTimePercentiles {
  const periods = calendarPeriods(db, startedAt, unit);
  const [p50, p85, p95] = [50, 85, 95].map((p) => series(db, leadTimePercentile(p), periods));
  return {
    data: periods.map(({ period }, i) => ({ period, p50: p50[i], p85: p85[i], p95: p95[i] })),
    globalP85: evaluate(db, leadTimePercentile(85), { startedAt, finishedAt: asOf }) ?? 0,
  };
}

/** ビンの幅は全体の最大値を6分割した値。範囲内の暦の期間すべてに、出現したビンすべての件数を並べる */
export function leadTimeHistogram(db: Database, startedAt: string, unit: TimeUnit): LeadTimeHistogram {
  const done = q<{ period: string; v: number }>(
    db,
    `SELECT ${calendarPeriod(unit)} AS period, t.lead_time_days AS v
     FROM tasks_local t JOIN calendar c ON c.date = t.completed_date WHERE t.status = 'DONE' AND t.completed_date >= ?1`,
    [startedAt],
  );
  if (done.length === 0) return { data: [], bins: [] };
  const binSize = Math.max(1, Math.ceil(Math.max(...done.map((d) => d.v)) / 6));
  const bin = (v: number) => Math.floor(v / binSize) * binSize;
  const bins = [...new Set(done.map((d) => bin(d.v)))].sort((a, b) => a - b);
  const label = (b: number) => `${b}–${b + binSize}d`;
  const data = calendarPeriods(db, startedAt, unit).map(({ period }) => {
    const row: Record<string, string | number> = { period };
    for (const b of bins) row[label(b)] = done.filter((d) => d.period === period && bin(d.v) === b).length;
    return row;
  });
  return { data, bins: bins.map(label) };
}

/** 各期間の終わりの WIP と、期間内の完了数・平均リードタイム */
export function wipByPeriod(db: Database, startedAt: string, unit: TimeUnit): WipPoint[] {
  const periods = calendarPeriods(db, startedAt, unit);
  const [wip, throughput, avgLead] = [FLOW_METRICS.wip, TASK_METRICS.throughput, FLOW_METRICS.avgLeadTime].map((def) => series(db, def, periods));
  return periods.map(({ period, startedAt, finishedAt }, i) => ({
    period, days: daysBetween(startedAt, finishedAt) + 1, wip: wip[i] ?? 0, throughput: throughput[i] ?? 0, avgLead: avgLead[i],
  }));
}

/** 開始・完了・CLOSE を範囲の始まりから累積する */
export function cumulativeFlow(db: Database, startedAt: string, unit: TimeUnit | "day"): FlowPoint[] {
  const periods = calendarPeriods(db, startedAt, unit);
  const [started, completed, closed] = [FLOW_METRICS.started, FLOW_METRICS.completed, FLOW_METRICS.closed].map((def) => cumsum(series(db, def, periods)));
  return periods.map(({ period }, i) => ({ period, Started: started[i], Completed: completed[i], Closed: closed[i] }));
}

function cumsum(values: (number | null)[]): number[] {
  let total = 0;
  return values.map((v) => (total += v ?? 0));
}

export function burnByDate(db: Database, startedAt: string): BurnPoint[] {
  const flow = cumulativeFlow(db, startedAt, "day");
  const wip = series(db, FLOW_METRICS.wip, calendarPeriods(db, startedAt, "day"));
  return flow.map(({ period, Started, Completed }, i) => ({ date: period, Started, Completed, WIP: wip[i] ?? 0 }));
}

export function cashFlowByPeriod(db: Database, startedAt: string, unit: TimeUnit): CashFlowPoint[] {
  return cumulativeFlow(db, startedAt, unit).map(({ period, Started, Completed }) => ({ period, CashFlow: Completed - Started }));
}

/** 完了数 (T) と、日ごとに時間へ丸めた作業時間の期間合計 (OE)。何もない期間も 0 で返す */
export function netProfitByPeriod(db: Database, startedAt: string, unit: TimeUnit): NetProfitPoint[] {
  const points = new Map<string, NetProfitPoint>();
  for (const d of q<{ period: string; done: number; work_minutes: number }>(
    db,
    `SELECT ${calendarPeriod(unit)} AS period, f.done, f.work_minutes
     FROM daily_task_facts f JOIN calendar c USING (date) WHERE f.date >= ?1 ORDER BY f.date`,
    [startedAt],
  )) {
    const p = points.get(d.period) ?? { period: d.period, Throughput: 0, OE: 0 };
    p.Throughput += d.done;
    p.OE += Math.round((d.work_minutes / 60) * 10) / 10;
    points.set(d.period, p);
  }
  return [...points.values()];
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
    // 直前と別のタスクで、その日に前にも触っていれば、触ったのは直前より前になる
    `WITH s AS (
       SELECT substr(start, 1, 10) AS d, task_id,
         lag(task_id) OVER (PARTITION BY substr(start, 1, 10) ORDER BY start, seq) AS prev,
         row_number() OVER (PARTITION BY substr(start, 1, 10), task_id ORDER BY start, seq) AS nth
       FROM clocks_local WHERE substr(start, 1, 10) >= ?1
     ),
     daily AS (SELECT d, sum(nth > 1 AND task_id <> prev) AS n FROM s GROUP BY d)
     SELECT ${calendarPeriod(unit)} AS period, coalesce(sum(n), 0) AS count
     FROM calendar c LEFT JOIN daily ON daily.d = c.date WHERE c.date >= ?1 GROUP BY period ORDER BY period`,
    [startedAt],
  );
}

type Buckets = { label: string; maxMinutes: number }[];

const FOCUS_BUCKETS: Buckets = [
  { label: "<1h", maxMinutes: 60 },
  { label: "1-2h", maxMinutes: 120 },
  { label: "2-3h", maxMinutes: 180 },
  { label: "3-4h", maxMinutes: 240 },
  { label: "4h+", maxMinutes: Infinity },
];

const TASK_SIZE_BUCKETS: Buckets = [
  { label: "<1h", maxMinutes: 60 },
  { label: "1-2h", maxMinutes: 120 },
  { label: "2-4h", maxMinutes: 240 },
  { label: "4-8h", maxMinutes: 480 },
  { label: "8-16h", maxMinutes: 960 },
  { label: "16h+", maxMinutes: Infinity },
];

/** from は minutes の列を持つ行を返す FROM 句。最後のビンは上限なし */
function bucketCounts(db: Database, buckets: Buckets, from: string, params: SqlValue[]): { bucket: string; count: number }[] {
  const finite = buckets.slice(0, -1);
  const bucket = `CASE ${finite.map((b, i) => `WHEN minutes < ${b.maxMinutes} THEN ${i}`).join(" ")} ELSE ${finite.length} END`;
  const counts = new Map(q<{ b: number; n: number }>(db, `SELECT ${bucket} AS b, count(*) AS n ${from} GROUP BY b`, params).map((r) => [r.b, r.n]));
  return buckets.map((b, i) => ({ bucket: b.label, count: counts.get(i) ?? 0 }));
}

export function focusBlockHistogram(db: Database, startedAt: string): { bucket: string; count: number }[] {
  return bucketCounts(db, FOCUS_BUCKETS, "FROM focus_blocks WHERE substr(start, 1, 10) >= ?1", [startedAt]);
}

export function taskSizeHistogram(db: Database, startedAt: string): { bucket: string; count: number }[] {
  return bucketCounts(db, TASK_SIZE_BUCKETS, "FROM (SELECT total_minutes AS minutes FROM tasks_local WHERE status = 'DONE' AND completed_date >= ?1)", [startedAt]);
}

export function estimates(db: Database, startedAt: string): { title: string; effortMinutes: number; actualMinutes: number }[] {
  return q(
    db,
    `SELECT title, effort_minutes AS effortMinutes, total_minutes AS actualMinutes FROM tasks_local
     WHERE status = 'DONE' AND completed_date >= ?1 AND effort_minutes > 0 ORDER BY completed_date, id`,
    [startedAt],
  );
}

function minutesByWeekdayHour(db: Database, table: "clocks_local" | "activity_clocks_local", startedAt: string): WeekdayHourMinutes[] {
  return q(
    db,
    `SELECT (CAST(strftime('%w', start) AS INTEGER) + 6) % 7 AS weekday, CAST(strftime('%H', start) AS INTEGER) AS hour, sum(minutes) AS minutes
     FROM ${table} WHERE substr(start, 1, 10) >= ?1 GROUP BY weekday, hour ORDER BY weekday, hour`,
    [startedAt],
  );
}

export const workByWeekdayHour = (db: Database, startedAt: string) => minutesByWeekdayHour(db, "clocks_local", startedAt);

export const OTHER_PROJECTS = "その他";
const TOP_PROJECTS = 7;

export function workByProject(db: Database, startedAt: string, unit: TimeUnit): { data: Record<string, string | number>[]; projects: string[] } {
  const cells = q<{ period: string; file: string; minutes: number }>(
    db,
    `SELECT ${calendarPeriod(unit)} AS period, t.file, sum(s.minutes) AS minutes
     FROM clocks_local s JOIN tasks t ON t.id = s.task_id JOIN calendar c ON c.date = substr(s.start, 1, 10)
     WHERE c.date >= ?1 GROUP BY period, t.file ORDER BY period`,
    [startedAt],
  );
  const totals = new Map<string, number>();
  for (const c of cells) totals.set(c.file, (totals.get(c.file) ?? 0) + c.minutes);
  const ranked = [...totals].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([file]) => file);
  const top = new Set(ranked.slice(0, TOP_PROJECTS));
  const projects = [...ranked.slice(0, TOP_PROJECTS), ...(ranked.length > TOP_PROJECTS ? [OTHER_PROJECTS] : [])];

  const byPeriod = new Map(
    calendarPeriods(db, startedAt, unit).map(({ period }) => [period, Object.fromEntries([["period", period], ...projects.map((p) => [p, 0])])]),
  );
  for (const c of cells) {
    const row = byPeriod.get(c.period)!;
    const key = top.has(c.file) ? c.file : OTHER_PROJECTS;
    row[key] = (row[key] as number) + c.minutes;
  }
  return { data: [...byPeriod.values()], projects };
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

/** 範囲内に一度でも実施した Activity について、暦の期間すべてを 0 で埋めて返す */
export function activityByPeriod(db: Database, startedAt: string, unit: TimeUnit): { period: string; title: string; minutes: number }[] {
  return q(
    db,
    `WITH titles AS (SELECT DISTINCT title FROM activity_daily WHERE date >= ?1)
     SELECT ${calendarPeriod(unit)} AS period, t.title, coalesce(sum(a.minutes), 0) AS minutes
     FROM calendar c CROSS JOIN titles t LEFT JOIN activity_daily a ON a.date = c.date AND a.title = t.title
     WHERE c.date >= ?1 GROUP BY period, t.title ORDER BY period, t.title`,
    [startedAt],
  );
}

export const activityByWeekdayHour = (db: Database, startedAt: string) => minutesByWeekdayHour(db, "activity_clocks_local", startedAt);

/**
 * Activity ごとの最長・現在のストリークと実施率。連続する日の島を「日付 - 島内の順番」で見分ける。
 * 当日か前日に実施していればストリーク継続中とみなす
 */
export function activityStreaks(db: Database, startedAt: string, asOf: string): Streak[] {
  return q<Streak>(
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

// --- Notes ---

export const NO_TAG = "タグなし";

export function notesInRange(db: Database, startedAt: string): NoteEntry[] {
  return q<Omit<NoteEntry, "tags"> & { tags: string | null }>(
    db,
    // group_concat は並びを約束しないので、先に並べる
    `SELECT n.file, n.title, n.created, n.published, n.lead_time_days, n.status,
       (SELECT group_concat(tag, ' ') FROM (SELECT tag FROM note_tags t WHERE t.file = n.file ORDER BY t.rowid)) AS tags
     FROM notes n WHERE n.created >= ?1 OR n.published >= ?1 OR n.status = 'draft' ORDER BY n.created DESC, n.file`,
    [startedAt],
  ).map((n) => ({ ...n, tags: n.tags ? n.tags.split(" ") : [] }));
}

export function notesCreatedByStatus(db: Database, startedAt: string, unit: TimeUnit): NotesByStatus[] {
  return q(
    db,
    `SELECT ${calendarPeriod(unit)} AS period,
       coalesce(sum(n.status = 'draft'), 0) AS draft, coalesce(sum(n.status = 'published'), 0) AS published
     FROM calendar c LEFT JOIN notes n ON n.created = c.date WHERE c.date >= ?1 GROUP BY period ORDER BY period`,
    [startedAt],
  );
}

/** 列の名前はタグに印を付けて、period や「タグなし」という名前のタグとぶつからないようにする */
export function notesCreatedByTag(db: Database, startedAt: string, unit: TimeUnit): { data: Record<string, string | number>[]; tags: NoteTagSeries[] } {
  const cells = q<{ period: string; tag: string | null; n: number }>(
    db,
    `SELECT ${calendarPeriod(unit)} AS period,
       (SELECT tag FROM note_tags t WHERE t.file = n.file ORDER BY t.rowid LIMIT 1) AS tag, count(*) AS n
     FROM notes n JOIN calendar c ON c.date = n.created WHERE n.created >= ?1 GROUP BY period, tag`,
    [startedAt],
  );
  const series = (tag: string | null): NoteTagSeries => (tag === null ? { key: "no-tag", name: NO_TAG } : { key: `tag:${tag}`, name: tag });
  const totals = new Map<string, { series: NoteTagSeries; n: number }>();
  for (const c of cells) {
    const s = series(c.tag);
    totals.set(s.key, { series: s, n: (totals.get(s.key)?.n ?? 0) + c.n });
  }
  const tags = [...totals.values()]
    .sort((a, b) => Number(a.series.key === "no-tag") - Number(b.series.key === "no-tag") || b.n - a.n || (a.series.name < b.series.name ? -1 : 1))
    .map((t) => t.series);
  const byPeriod = new Map(
    calendarPeriods(db, startedAt, unit).map(({ period }) => [period, Object.fromEntries([["period", period], ...tags.map((t) => [t.key, 0])])]),
  );
  for (const c of cells) byPeriod.get(c.period)![series(c.tag).key] = c.n;
  return { data: [...byPeriod.values()], tags };
}
