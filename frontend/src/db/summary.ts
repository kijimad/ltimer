import type { Database, SqlValue } from "sql.js";
import type { TimeRange } from "../types/index.ts";
import type { GaugeMetric, Summary, TileMetric } from "../metrics.ts";
import { summaryPeriods, type Period } from "../metrics.ts";
import { rows } from "./database.ts";

/** これ未満の間隔はポモドーロの休憩などとみなし、手を離した待ちと区別する */
export const RESUME_GAP_MINUTES = 60;
/** 直近この日数以内に CLOCK した TODO をアクティブな仕掛かりとみなす */
const ACTIVE_WIP_DAYS = 14;
/** SLO: リードタイム SLO_DAYS 日以内の割合を SLO_TARGET% 以上に保つ */
const SLO_DAYS = 3;
const SLO_TARGET = 90;
const DEEP_FOCUS_MINUTES = 120;

/** 1行1列の結果を返す SQL を期間ごとに評価する */
function scalar(db: Database, sql: string, params: SqlValue[]): number | null {
  const [row] = rows<{ v: number | null }>(db, sql, params);
  return row?.v ?? null;
}

function gauge(
  db: Database,
  periods: Period[],
  sql: string,
  meta: Omit<GaugeMetric, "value" | "history">,
): GaugeMetric {
  const at = (p: Period) => scalar(db, sql, [p.startedAt, p.finishedAt]);
  const [current, ...past] = periods;
  return { ...meta, value: at(current), history: past.map(at).filter((v): v is number => v !== null) };
}

function dataStart(db: Database, sql: string): string {
  return rows<{ v: string | null }>(db, sql)[0]?.v ?? "";
}

// ?1, ?2 は期間の開始日と終了日 (両端を含む)
const DONE_IN = "FROM tasks_local WHERE status = 'DONE' AND completed_date BETWEEN ?1 AND ?2";

export function taskSummary(db: Database, asOf: string, range: TimeRange): Summary {
  const periods = summaryPeriods(range, asOf, dataStart(db, "SELECT min(substr(first_clock_in, 1, 10)) AS v FROM tasks_local"));
  const g = (sql: string, meta: Omit<GaugeMetric, "value" | "history">) => gauge(db, periods, sql, meta);

  const activeWip = scalar(
    db,
    `SELECT count(*) AS v FROM tasks_local
     WHERE status = 'TODO' AND substr(last_clock_out, 1, 10) > date(?1, ?2) AND substr(last_clock_out, 1, 10) <= ?1`,
    [asOf, `-${ACTIVE_WIP_DAYS} days`],
  )!;
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
    { key: "active-wip", label: "アクティブ WIP", desc: `${ACTIVE_WIP_DAYS}日以内に CLOCK した TODO`, value: activeWip },
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
    gauges: [
      g(`SELECT count(*) AS v ${DONE_IN}`, {
        key: "throughput", label: "スループット", desc: "DONE 数", unit: "件", higherIsBetter: true,
      }),
      g(`SELECT percentile(lead_time_days, 85) AS v ${DONE_IN}`, {
        key: "lead-time", label: "リードタイム p85", desc: "DONE のリードタイム (SLE)", unit: "日", higherIsBetter: false,
      }),
      g(`SELECT 100.0 * sum(lead_time_days <= ${SLO_DAYS}) / count(*) AS v ${DONE_IN}`, {
        key: "slo", label: "SLO 達成率", desc: `DONE のうち ${SLO_DAYS}日以内 (目標 ${SLO_TARGET}%)`, unit: "%", higherIsBetter: true, target: SLO_TARGET,
      }),
      g(`SELECT percentile(total_minutes * 100.0 / (lead_time_days * 24 * 60), 50) AS v ${DONE_IN} AND lead_time_days > 0`, {
        key: "flow-efficiency", label: "フロー効率", desc: "DONE の実作業時間÷リードタイム (中央値)", unit: "%", higherIsBetter: true,
      }),
      g(
        `SELECT percentile(minutes / 60.0, 50) AS v FROM session_gaps
         WHERE minutes >= ${RESUME_GAP_MINUTES} AND substr(resumed_at, 1, 10) BETWEEN ?1 AND ?2`,
        {
          key: "resume-wait", label: "再開待ち時間", desc: `手を離した (${RESUME_GAP_MINUTES}分以上空いた) タスクに戻るまでの中央値`, unit: "h", higherIsBetter: false,
        },
      ),
      g(`SELECT count(*) AS v FROM focus_blocks WHERE minutes >= ${DEEP_FOCUS_MINUTES} AND substr(start, 1, 10) BETWEEN ?1 AND ?2`, {
        key: "deep-focus", label: "集中ブロック (2h+)", desc: "60分未満の間隔でつなげた作業が2時間以上続いた回数", unit: "回", higherIsBetter: true,
      }),
      g(`SELECT 100.0 * sum(status = 'CLOSE') / count(*) AS v FROM tasks_local WHERE completed_date BETWEEN ?1 AND ?2`, {
        key: "close-rate", label: "CLOSE 率", desc: "終えたタスクのうち捨てた割合", unit: "%", higherIsBetter: false,
      }),
    ],
    tiles,
  };
}

// 公開日がわかるので、過去の期間の終点で下書きだったものを再現できる
const OPEN_AT_END = "FROM drafts WHERE created <= ?2 AND (published IS NULL OR published > ?2)";

export function draftSummary(db: Database, asOf: string, range: TimeRange): Summary {
  const periods = summaryPeriods(range, asOf, dataStart(db, "SELECT min(created) AS v FROM drafts"));
  const g = (sql: string, meta: Omit<GaugeMetric, "value" | "history">) => gauge(db, periods, sql, meta);
  return {
    gauges: [
      g("SELECT count(*) AS v FROM drafts WHERE published BETWEEN ?1 AND ?2", {
        key: "publish-count", label: "公開数", desc: "公開した記事の数", unit: "件", higherIsBetter: true,
      }),
      g(`SELECT count(*) AS v ${OPEN_AT_END}`, {
        key: "open-drafts", label: "未公開 Draft", desc: "現時点で draft タグが付いた記事", unit: "件", higherIsBetter: false,
      }),
      g("SELECT percentile(lead_time_days, 50) AS v FROM drafts WHERE published BETWEEN ?1 AND ?2 AND lead_time_days IS NOT NULL", {
        key: "publish-lead-time", label: "公開リードタイム", desc: "公開した記事の中央値", unit: "日", higherIsBetter: false,
      }),
      g(`SELECT CAST(max(julianday(?2) - julianday(created)) AS INTEGER) AS v ${OPEN_AT_END}`, {
        key: "oldest-draft", label: "最古 Draft", desc: "現時点で最も古い下書きの経過日数", unit: "日", higherIsBetter: false,
      }),
    ],
    tiles: [],
  };
}

const ACTIVITY_IN = "FROM activity_daily WHERE date BETWEEN ?1 AND ?2";

export function activitySummary(db: Database, asOf: string, range: TimeRange): Summary {
  const periods = summaryPeriods(range, asOf, dataStart(db, "SELECT min(date) AS v FROM activity_daily"));
  const g = (sql: string, meta: Omit<GaugeMetric, "value" | "history">) => gauge(db, periods, sql, meta);
  return {
    gauges: [
      g(`SELECT coalesce(sum(minutes), 0) / 60.0 AS v ${ACTIVITY_IN}`, {
        key: "hours", label: "投下時間", desc: "Activity の合計", unit: "h", higherIsBetter: true,
      }),
      // 範囲内に一度でも実施した Activity を対象とし、対象×日数のうち実施した割合
      g(
        `SELECT 100.0 * count(*) / (count(DISTINCT title) * (julianday(?2) - julianday(?1) + 1)) AS v ${ACTIVITY_IN}`,
        { key: "done-rate", label: "習慣実施率", desc: "実施した Activity × 日数のうち実施した割合", unit: "%", higherIsBetter: true },
      ),
      g(`SELECT count(DISTINCT date) AS v ${ACTIVITY_IN}`, {
        key: "active-days", label: "活動日数", desc: "Activity を1つ以上実施した日数", unit: "日", higherIsBetter: true,
      }),
    ],
    tiles: [],
  };
}
