import type { Task, DraftEntry, ActivityDailyEntry, TimeRange } from "./types/index.ts";
import { completedDate } from "./hooks/usePeriodKey.ts";
import { rangeDates } from "./hooks/useTimeRange.ts";
import { addDays, daysBetween } from "./dates.ts";
import { sessionGaps, RESUME_GAP_MINUTES } from "./spans.ts";

/** 直近この日数以内に CLOCK した TODO をアクティブな仕掛かりとみなす */
const ACTIVE_WIP_DAYS = 14;
/** SLO: リードタイム SLO_DAYS 日以内の割合を SLO_TARGET% 以上に保つ */
const SLO_DAYS = 3;
const SLO_TARGET = 90;
export const HISTORY_PERIODS = 12;

export interface GaugeMetric {
  key: string;
  label: string;
  desc: string;
  unit: string;
  value: number | null;
  history: number[];
  higherIsBetter: boolean;
  target?: number;
}

export interface TileMetric {
  key: string;
  label: string;
  desc: string;
  value: number;
}

export interface Summary {
  gauges: GaugeMetric[];
  tiles: TileMetric[];
}

/** min/max が目盛りの両端、lo/hi が色帯の境界 */
export interface Scale {
  min: number;
  max: number;
  lo: number;
  hi: number;
}

export type Band = "low" | "mid" | "high";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function inWindow(date: string, ref: string, days: number): boolean {
  return date > addDays(ref, -days) && date <= ref;
}

/** チャートの絞り込みと同じく両端を含む */
interface Period {
  startedAt: string;
  finishedAt: string;
}

function inPeriod(date: string, p: Period): boolean {
  return date >= p.startedAt && date <= p.finishedAt;
}

/**
 * 選択中の範囲と、同じ長さで重ならない過去の期間。重なる窓だと分布がほぼ1点に潰れる。
 * データの最初の日より前から始まる期間は件数が欠けて 0 寄りになるので含めない
 */
export function summaryPeriods(range: TimeRange, asOf: string, dataStart: string): Period[] {
  const result = [rangeDates(range, asOf)];
  for (let i = 0; i < HISTORY_PERIODS; i++) {
    const p = rangeDates(range, addDays(result[i].startedAt, -1));
    if (p.startedAt < dataStart) break;
    result.push(p);
  }
  return result;
}

function earliest(dates: string[]): string {
  return dates.reduce((a, b) => (b < a ? b : a), dates[0] ?? "");
}

function gauge(
  periods: Period[],
  f: (p: Period) => number | null,
  meta: Omit<GaugeMetric, "value" | "history">,
): GaugeMetric {
  const [current, ...past] = periods;
  return { ...meta, value: f(current), history: past.map(f).filter((v): v is number => v !== null) };
}

function finishedIn(tasks: Task[], p: Period): Task[] {
  return tasks.filter((t) => {
    const cd = completedDate(t);
    return cd !== null && inPeriod(cd, p);
  });
}

function doneIn(tasks: Task[], p: Period): Task[] {
  return finishedIn(tasks, p).filter((t) => t.status === "DONE");
}

export function taskSummary(tasks: Task[], asOf: string, range: TimeRange): Summary {
  const periods = summaryPeriods(range, asOf, earliest(tasks.map((t) => t.first_clock_in.slice(0, 10))));
  const throughput = (p: Period) => doneIn(tasks, p).length;
  const leadTimeP85 = (p: Period) => {
    const lts = doneIn(tasks, p).map((t) => t.lead_time_days).sort((a, b) => a - b);
    return lts.length > 0 ? percentile(lts, 85) : null;
  };
  const flowEfficiency = (p: Period) => {
    const effs = doneIn(tasks, p)
      .filter((t) => t.lead_time_days > 0)
      .map((t) => (t.total_minutes / (t.lead_time_days * 24 * 60)) * 100)
      .sort((a, b) => a - b);
    return effs.length > 0 ? percentile(effs, 50) : null;
  };
  const sloAttainment = (p: Period) => {
    const done = doneIn(tasks, p);
    return done.length > 0 ? (done.filter((t) => t.lead_time_days <= SLO_DAYS).length / done.length) * 100 : null;
  };
  const resumeGaps = tasks.flatMap(sessionGaps).filter((g) => g.minutes >= RESUME_GAP_MINUTES);
  const resumeWait = (p: Period) => {
    const hours = resumeGaps
      .filter((g) => inPeriod(g.resumedAt.slice(0, 10), p))
      .map((g) => g.minutes / 60)
      .sort((a, b) => a - b);
    return hours.length > 0 ? percentile(hours, 50) : null;
  };
  const closeRate = (p: Period) => {
    const finished = finishedIn(tasks, p);
    return finished.length > 0 ? (finished.filter((t) => t.status === "CLOSE").length / finished.length) * 100 : null;
  };
  // TODO は現在の status しか持たず過去時点を復元できないので、分布のないタイルにする
  const todos = tasks.filter((t) => t.status === "TODO");
  const activeWip = todos.filter((t) => inWindow(t.last_clock_out.slice(0, 10), asOf, ACTIVE_WIP_DAYS)).length;

  return {
    gauges: [
      gauge(periods, throughput, {
        key: "throughput", label: "スループット", desc: "DONE 数", unit: "件", higherIsBetter: true,
      }),
      gauge(periods, leadTimeP85, {
        key: "lead-time", label: "リードタイム p85", desc: "DONE のリードタイム (SLE)", unit: "日", higherIsBetter: false,
      }),
      gauge(periods, sloAttainment, {
        key: "slo", label: "SLO 達成率", desc: `DONE のうち ${SLO_DAYS}日以内 (目標 ${SLO_TARGET}%)`, unit: "%", higherIsBetter: true, target: SLO_TARGET,
      }),
      gauge(periods, flowEfficiency, {
        key: "flow-efficiency", label: "フロー効率", desc: "DONE の実作業時間÷リードタイム (中央値)", unit: "%", higherIsBetter: true,
      }),
      gauge(periods, resumeWait, {
        key: "resume-wait", label: "再開待ち時間", desc: `手を離した (${RESUME_GAP_MINUTES}分以上空いた) タスクに戻るまでの中央値`, unit: "h", higherIsBetter: false,
      }),
      gauge(periods, closeRate, {
        key: "close-rate", label: "CLOSE 率", desc: "終えたタスクのうち捨てた割合", unit: "%", higherIsBetter: false,
      }),
    ],
    tiles: [
      { key: "active-wip", label: "アクティブ WIP", desc: `${ACTIVE_WIP_DAYS}日以内に CLOCK した TODO`, value: activeWip },
      { key: "stale-todo", label: "放置 TODO", desc: `${ACTIVE_WIP_DAYS}日以上触っていない TODO`, value: todos.length - activeWip },
    ],
  };
}

export function draftSummary(entries: DraftEntry[], asOf: string, range: TimeRange): Summary {
  const periods = summaryPeriods(range, asOf, earliest(entries.map((e) => e.created)));
  // 公開日がわかるので、過去の期間の終点で下書きだったものを再現できる
  const openAt = (ref: string) => entries.filter((e) => e.created <= ref && (e.published === null || e.published > ref));
  const openCount = (p: Period) => openAt(p.finishedAt).length;
  const publishLeadTime = (p: Period) => {
    const lts = entries
      .filter((e) => e.published !== null && e.lead_time_days !== null && inPeriod(e.published, p))
      .map((e) => e.lead_time_days!)
      .sort((a, b) => a - b);
    return lts.length > 0 ? percentile(lts, 50) : null;
  };
  const oldestAge = (p: Period) => {
    const ages = openAt(p.finishedAt).map((e) => daysBetween(e.created, p.finishedAt));
    return ages.length > 0 ? Math.max(...ages) : null;
  };

  return {
    gauges: [
      gauge(periods, openCount, {
        key: "open-drafts", label: "未公開 Draft", desc: "現時点で draft タグが付いた記事", unit: "件", higherIsBetter: false,
      }),
      gauge(periods, publishLeadTime, {
        key: "publish-lead-time", label: "公開リードタイム", desc: "公開した記事の中央値", unit: "日", higherIsBetter: false,
      }),
      gauge(periods, oldestAge, {
        key: "oldest-draft", label: "最古 Draft", desc: "現時点で最も古い下書きの経過日数", unit: "日", higherIsBetter: false,
      }),
    ],
    tiles: [],
  };
}

export function activitySummary(daily: ActivityDailyEntry[], asOf: string, range: TimeRange): Summary {
  const periods = summaryPeriods(range, asOf, earliest(daily.map((d) => d.date)));
  const inRange = (p: Period) => daily.filter((d) => inPeriod(d.date, p) && d.activities.length > 0);

  const hours = (p: Period) =>
    inRange(p).reduce((s, d) => s + d.activities.reduce((m, a) => m + a.minutes, 0), 0) / 60;
  // 窓内に一度でも実施した Activity を対象とし、対象×日数のうち実施した割合
  const doneRate = (p: Period) => {
    const days = inRange(p);
    const targets = new Set(days.flatMap((d) => d.activities.map((a) => a.title)));
    if (targets.size === 0) return null;
    const done = days.reduce((s, d) => s + new Set(d.activities.map((a) => a.title)).size, 0);
    return (done / (targets.size * (daysBetween(p.startedAt, p.finishedAt) + 1))) * 100;
  };
  const activeDays = (p: Period) => inRange(p).length;

  return {
    gauges: [
      gauge(periods, hours, {
        key: "hours", label: "投下時間", desc: "Activity の合計", unit: "h", higherIsBetter: true,
      }),
      gauge(periods, doneRate, {
        key: "done-rate", label: "習慣実施率", desc: "実施した Activity × 日数のうち実施した割合", unit: "%", higherIsBetter: true,
      }),
      gauge(periods, activeDays, {
        key: "active-days", label: "活動日数", desc: "Activity を1つ以上実施した日数", unit: "日", higherIsBetter: true,
      }),
    ],
    tiles: [],
  };
}

/** 過去分布の p10〜p90 を両端、p25/p75 を色帯の境界とする。include は必ず目盛りに含める */
export function scaleFrom(history: number[], include?: number): Scale | null {
  if (history.length === 0) return null;
  const sorted = [...history].sort((a, b) => a - b);
  const min = Math.min(percentile(sorted, 10), include ?? Infinity);
  const max = Math.max(percentile(sorted, 90), include ?? -Infinity, min + 1);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return { min, max, lo: clamp(percentile(sorted, 25)), hi: clamp(percentile(sorted, 75)) };
}

/** 目盛りの端に張り付いた値は、帯の幅が潰れていても端の帯に入れる */
export function bandOf(value: number, scale: Scale): Band {
  if (value < scale.lo || value <= scale.min) return "low";
  if (value > scale.hi || value >= scale.max) return "high";
  return "mid";
}
