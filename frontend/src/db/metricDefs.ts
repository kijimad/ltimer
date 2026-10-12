// 指標の定義。サマリのゲージもチャートの系列も、ここの SQL を期間の並びに当てはめて作る
import type { Database } from "sql.js";
import type { TimeUnit } from "../types/index.ts";
import type { GaugeMetric, Period } from "../metrics.ts";
import { rows } from "./database.ts";

/** これ未満の間隔はポモドーロの休憩などとみなし、手を離した待ちと区別する */
export const RESUME_GAP_MINUTES = 60;
/** SLO: リードタイム SLO_DAYS 日以内の割合を SLO_TARGET% 以上に保つ */
const SLO_DAYS = 3;
const SLO_TARGET = 90;
const DEEP_FOCUS_MINUTES = 120;
/** この時刻から翌朝 LATE_NIGHT_END 時までに始めたセッションを深夜の作業とみなす */
const LATE_NIGHT_START = 22;
const LATE_NIGHT_END = 5;
/** 直近この日数以内に CLOCK した未完了のタスクをアクティブな仕掛かりとみなす */
export const ACTIVE_WIP_DAYS = 14;

export interface MetricDef extends Omit<GaugeMetric, "value" | "history"> {
  /** ?1, ?2 は期間の開始日と終了日 (両端を含む)。1行1列の v を返す */
  sql: string;
}

const FACTS_IN = "FROM daily_task_facts WHERE date BETWEEN ?1 AND ?2";
const DONE_IN = "FROM tasks_local WHERE status = 'DONE' AND completed_date BETWEEN ?1 AND ?2";

export function leadTimePercentile(p: number): MetricDef {
  return {
    key: `lead-time-p${p}`, label: `リードタイム p${p}`, desc: "DONE のリードタイム", unit: "日", higherIsBetter: false,
    sql: `SELECT percentile(lead_time_days, ${p}) AS v ${DONE_IN}`,
  };
}

export const TASK_METRICS = {
  throughput: {
    key: "throughput", label: "スループット", desc: "DONE 数", unit: "件", group: "フロー", higherIsBetter: true,
    sql: "SELECT coalesce(sum(done), 0) AS v FROM daily_task_facts WHERE date BETWEEN ?1 AND ?2",
  },
  leadTime: { ...leadTimePercentile(85), key: "lead-time", desc: "DONE のリードタイム (SLE)", group: "フロー" },
  slo: {
    key: "slo", label: "SLO 達成率", desc: `DONE のうち ${SLO_DAYS}日以内 (目標 ${SLO_TARGET}%)`, unit: "%", group: "フロー", higherIsBetter: true, target: SLO_TARGET,
    sql: `SELECT 100.0 * sum(lead_time_days <= ${SLO_DAYS}) / count(*) AS v ${DONE_IN}`,
  },
  flowEfficiency: {
    key: "flow-efficiency", label: "フロー効率", desc: "DONE の実作業時間÷リードタイム (中央値)", unit: "%", group: "フロー", higherIsBetter: true,
    sql: `SELECT percentile(total_minutes * 100.0 / (lead_time_days * 24 * 60), 50) AS v ${DONE_IN} AND lead_time_days > 0`,
  },
  flowLoad: {
    key: "flow-load", label: "着手/完了比", desc: "着手したタスク÷終えたタスク。1 を超え続けるなら手を広げすぎ", unit: "倍", group: "フロー", higherIsBetter: false,
    sql: `SELECT 1.0 * sum(started) / nullif(sum(done + closed), 0) AS v ${FACTS_IN}`,
  },
  closeRate: {
    key: "close-rate", label: "CLOSE 率", desc: "終えたタスクのうち捨てた割合", unit: "%", group: "フロー", higherIsBetter: false,
    sql: "SELECT 100.0 * sum(status = 'CLOSE') / count(*) AS v FROM tasks_local WHERE completed_date BETWEEN ?1 AND ?2",
  },
  deadline: {
    key: "deadline", label: "期限遵守率", desc: "DEADLINE のある DONE のうち、期限までに終えた割合", unit: "%", group: "フロー", higherIsBetter: true,
    sql: `SELECT 100.0 * sum(completed_date <= deadline) / count(*) AS v ${DONE_IN} AND deadline IS NOT NULL`,
  },
  resumeWait: {
    key: "resume-wait", label: "再開待ち時間", desc: `手を離した (${RESUME_GAP_MINUTES}分以上空いた) タスクに戻るまでの中央値`, unit: "h", group: "集中", higherIsBetter: false,
    sql: `SELECT percentile(minutes / 60.0, 50) AS v FROM session_gaps WHERE minutes >= ${RESUME_GAP_MINUTES} AND substr(resumed_at, 1, 10) BETWEEN ?1 AND ?2`,
  },
  deepFocus: {
    key: "deep-focus", label: "集中ブロック (2h+)", desc: "60分未満の間隔でつなげた作業が2時間以上続いた回数", unit: "回", group: "集中", higherIsBetter: true,
    sql: `SELECT count(*) AS v FROM focus_blocks WHERE minutes >= ${DEEP_FOCUS_MINUTES} AND substr(start, 1, 10) BETWEEN ?1 AND ?2`,
  },
  // 分母も集中ブロックの時間にして、重なったセッションを二重に数えない
  focusRatio: {
    key: "focus-ratio", label: "集中率", desc: `作業時間のうち ${DEEP_FOCUS_MINUTES / 60}時間以上の集中ブロックの割合`, unit: "%", group: "集中", higherIsBetter: true,
    sql: `SELECT 100.0 * sum(CASE WHEN minutes >= ${DEEP_FOCUS_MINUTES} THEN minutes ELSE 0 END) / sum(minutes) AS v
          FROM focus_blocks WHERE substr(start, 1, 10) BETWEEN ?1 AND ?2`,
  },
  tasksPerDay: {
    key: "tasks-per-day", label: "1日のタスク数", desc: "作業した日に触ったタスクの数 (中央値)", unit: "件", group: "集中", higherIsBetter: false,
    sql: `SELECT percentile(n, 50) AS v FROM (
            SELECT count(DISTINCT task_id) AS n FROM clocks_local WHERE substr(start, 1, 10) BETWEEN ?1 AND ?2 GROUP BY substr(start, 1, 10)
          )`,
  },
  // 重なったセッションで 100% を超えないよう 1 で止める
  density: {
    key: "density", label: "作業の密度", desc: "作業した日の、最初の開始から最後の終了までのうち CLOCK していた割合 (中央値)", unit: "%", group: "集中", higherIsBetter: true,
    sql: `SELECT percentile(r, 50) AS v FROM (
            SELECT 100.0 * min(1.0, sum(minutes) / ((julianday(max(end)) - julianday(min(start))) * 1440)) AS r
            FROM clocks_local WHERE substr(start, 1, 10) BETWEEN ?1 AND ?2 GROUP BY substr(start, 1, 10)
          )`,
  },
  lateNight: {
    key: "late-night", label: "深夜の作業", desc: `${LATE_NIGHT_START}時〜${LATE_NIGHT_END}時に始めたセッションの時間の割合`, unit: "%", group: "持続", higherIsBetter: false,
    sql: `SELECT 100.0 * sum(CASE WHEN CAST(strftime('%H', start) AS INTEGER) >= ${LATE_NIGHT_START}
                                    OR CAST(strftime('%H', start) AS INTEGER) < ${LATE_NIGHT_END} THEN minutes ELSE 0 END) / sum(minutes) AS v
          FROM clocks_local WHERE substr(start, 1, 10) BETWEEN ?1 AND ?2`,
  },
  restDays: {
    key: "rest-days", label: "休んだ日", desc: "タスクの CLOCK がなかった日", unit: "日", group: "持続", higherIsBetter: true,
    // 暦は Activity や記事の日付からも始まるので、タスクを記録し始める前の日は数えない
    sql: `SELECT count(*) AS v ${FACTS_IN} AND work_minutes = 0 AND date >= (SELECT min(substr(first_clock_in, 1, 10)) FROM tasks_local)`,
  },
  // 暦の週で区切ると範囲の端が欠けた週になり、1w の範囲では丸1週を数えられないので、連続する7日で見る。
  // 範囲の始めの7日に満たない窓は最初の7日に含まれるので、最大を変えない
  maxWeekHours: {
    key: "max-week-hours", label: "7日間の最大作業時間", desc: "期間内の連続する7日のうち、最も作業した7日の時間", unit: "h", group: "持続", higherIsBetter: false,
    sql: `SELECT max(h) AS v FROM (SELECT sum(work_minutes) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) / 60.0 AS h ${FACTS_IN})`,
  },
} satisfies Record<string, MetricDef>;


/** チャートの系列に使い、ゲージにはしない */
export const FLOW_METRICS = {
  started: {
    key: "started", label: "開始", desc: "着手したタスク", unit: "件", higherIsBetter: true,
    sql: `SELECT coalesce(sum(started), 0) AS v ${FACTS_IN}`,
  },
  completed: {
    key: "completed", label: "完了", desc: "DONE か CLOSE にしたタスク", unit: "件", higherIsBetter: true,
    sql: `SELECT coalesce(sum(done + closed), 0) AS v ${FACTS_IN}`,
  },
  closed: {
    key: "closed", label: "CLOSE", desc: "CLOSE にしたタスク", unit: "件", higherIsBetter: false,
    sql: `SELECT coalesce(sum(closed), 0) AS v ${FACTS_IN}`,
  },
  // 放置された TODO まで数えると WIP が過去の積み残しで埋まるので、直近に触ったものに限る。
  // CROSS JOIN で CLOCK の終了時刻の範囲から引かせる (タスク側から引くと日ごとの系列が遅い)
  wip: {
    key: "wip", label: "アクティブ WIP", desc: `期間の終わりに未完了で、${ACTIVE_WIP_DAYS}日以内に CLOCK したタスク`, unit: "件", higherIsBetter: false,
    sql: `SELECT count(DISTINCT t.id) AS v FROM clocks_local c CROSS JOIN tasks_local t ON t.id = c.task_id
          WHERE c.end >= date(?2, '-${ACTIVE_WIP_DAYS - 1} days') AND c.end < date(?2, '+1 day')
            AND (t.completed_date IS NULL OR t.completed_date > ?2)`,
  },
  avgLeadTime: {
    key: "avg-lead-time", label: "平均リードタイム", desc: "DONE のリードタイムの平均", unit: "日", higherIsBetter: false,
    sql: `SELECT avg(lead_time_days) AS v ${DONE_IN}`,
  },
} satisfies Record<string, MetricDef>;

// 公開日がわかるので、過去の期間の終点で下書きだったものを再現できる
const OPEN_AT_END = "FROM drafts WHERE created <= ?2 AND (published IS NULL OR published > ?2)";

export const DRAFT_METRICS = {
  publishCount: {
    key: "publish-count", label: "公開数", desc: "公開した記事の数", unit: "件", higherIsBetter: true,
    sql: "SELECT count(*) AS v FROM drafts WHERE published BETWEEN ?1 AND ?2",
  },
  openDrafts: {
    key: "open-drafts", label: "未公開 Draft", desc: "現時点で draft タグが付いた記事", unit: "件", higherIsBetter: false,
    sql: `SELECT count(*) AS v ${OPEN_AT_END}`,
  },
  publishLeadTime: {
    key: "publish-lead-time", label: "公開リードタイム", desc: "公開した記事の中央値", unit: "日", higherIsBetter: false,
    sql: "SELECT percentile(lead_time_days, 50) AS v FROM drafts WHERE published BETWEEN ?1 AND ?2 AND lead_time_days IS NOT NULL",
  },
  oldestDraft: {
    key: "oldest-draft", label: "最古 Draft", desc: "現時点で最も古い下書きの経過日数", unit: "日", higherIsBetter: false,
    sql: `SELECT CAST(max(julianday(?2) - julianday(created)) AS INTEGER) AS v ${OPEN_AT_END}`,
  },
} satisfies Record<string, MetricDef>;

const ACTIVITY_IN = "FROM activity_daily WHERE date BETWEEN ?1 AND ?2";

export const ACTIVITY_METRICS = {
  hours: {
    key: "hours", label: "投下時間", desc: "Activity の合計", unit: "h", higherIsBetter: true,
    sql: `SELECT coalesce(sum(minutes), 0) / 60.0 AS v ${ACTIVITY_IN}`,
  },
  // 範囲内に一度でも実施した Activity を対象とし、対象×日数のうち実施した割合
  doneRate: {
    key: "done-rate", label: "習慣実施率", desc: "実施した Activity × 日数のうち実施した割合", unit: "%", higherIsBetter: true,
    sql: `SELECT 100.0 * count(*) / (count(DISTINCT title) * (julianday(?2) - julianday(?1) + 1)) AS v ${ACTIVITY_IN}`,
  },
  activeDays: {
    key: "active-days", label: "活動日数", desc: "Activity を1つ以上実施した日数", unit: "日", higherIsBetter: true,
    sql: `SELECT count(DISTINCT date) AS v ${ACTIVITY_IN}`,
  },
} satisfies Record<string, MetricDef>;

export function evaluate(db: Database, def: MetricDef, p: Period): number | null {
  return series(db, def, [p])[0];
}

/** 指標を期間の並びに当てはめる。値のない期間は null */
export function series(db: Database, def: MetricDef, periods: Period[]): (number | null)[] {
  const stmt = db.prepare(def.sql);
  try {
    return periods.map((p) => {
      stmt.bind([p.startedAt, p.finishedAt]);
      const v = stmt.step() ? (stmt.getAsObject().v as number | null) : null;
      stmt.reset();
      return v;
    });
  } finally {
    stmt.free();
  }
}

/** startedAt からデータの最後の日までを、暦の日・週・月で区切った期間の並び */
export function calendarPeriods(db: Database, startedAt: string, unit: TimeUnit | "day"): (Period & { period: string })[] {
  const key = unit === "day" ? "date" : unit;
  return rows<Period & { period: string }>(
    db,
    `SELECT ${key} AS period, min(date) AS startedAt, max(date) AS finishedAt FROM calendar WHERE date >= ?1 GROUP BY ${key} ORDER BY ${key}`,
    [startedAt],
  );
}
