import type { Task, DraftEntry, ActivityDailyEntry } from "./types/index.ts";
import { completedDate } from "./hooks/usePeriodKey.ts";
import { addDays, daysBetween } from "./dates.ts";
import { sessionGaps, RESUME_GAP_MINUTES } from "./spans.ts";

/** 直近この日数以内に CLOCK した TODO をアクティブな仕掛かりとみなす */
const ACTIVE_WIP_DAYS = 14;
export const SUMMARY_WINDOW_DAYS = 28;
/** SLO: リードタイム SLO_DAYS 日以内の割合を SLO_TARGET% 以上に保つ */
const SLO_DAYS = 3;
const SLO_TARGET = 90;
/** 目盛りを決める過去分布のサンプル期間 */
const HISTORY_WEEKS = 12;

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

/** 28日窓は1日ずらしてもほぼ同じ値になるので、分布は週次でサンプルする */
function history(today: string, f: (ref: string) => number | null): number[] {
  return Array.from({ length: HISTORY_WEEKS }, (_, i) => f(addDays(today, -7 * (i + 1))))
    .filter((v): v is number => v !== null);
}

function gauge(
  today: string,
  f: (ref: string) => number | null,
  meta: Omit<GaugeMetric, "value" | "history">,
): GaugeMetric {
  return { ...meta, value: f(today), history: history(today, f) };
}

function finishedInWindow(tasks: Task[], ref: string, days: number): Task[] {
  return tasks.filter((t) => {
    const cd = completedDate(t);
    return cd !== null && inWindow(cd, ref, days);
  });
}

function doneInWindow(tasks: Task[], ref: string, days: number): Task[] {
  return finishedInWindow(tasks, ref, days).filter((t) => t.status === "DONE");
}

export function taskSummary(tasks: Task[], today: string): Summary {
  const throughput = (ref: string) => doneInWindow(tasks, ref, SUMMARY_WINDOW_DAYS).length;
  const leadTimeP85 = (ref: string) => {
    const lts = doneInWindow(tasks, ref, SUMMARY_WINDOW_DAYS).map((t) => t.lead_time_days).sort((a, b) => a - b);
    return lts.length > 0 ? percentile(lts, 85) : null;
  };
  const flowEfficiency = (ref: string) => {
    const effs = doneInWindow(tasks, ref, SUMMARY_WINDOW_DAYS)
      .filter((t) => t.lead_time_days > 0)
      .map((t) => (t.total_minutes / (t.lead_time_days * 24 * 60)) * 100)
      .sort((a, b) => a - b);
    return effs.length > 0 ? percentile(effs, 50) : null;
  };
  const sloAttainment = (ref: string) => {
    const done = doneInWindow(tasks, ref, SUMMARY_WINDOW_DAYS);
    return done.length > 0 ? (done.filter((t) => t.lead_time_days <= SLO_DAYS).length / done.length) * 100 : null;
  };
  const resumeGaps = tasks.flatMap(sessionGaps).filter((g) => g.minutes >= RESUME_GAP_MINUTES);
  const resumeWait = (ref: string) => {
    const hours = resumeGaps
      .filter((g) => inWindow(g.resumedAt.slice(0, 10), ref, SUMMARY_WINDOW_DAYS))
      .map((g) => g.minutes / 60)
      .sort((a, b) => a - b);
    return hours.length > 0 ? percentile(hours, 50) : null;
  };
  const closeRate = (ref: string) => {
    const finished = finishedInWindow(tasks, ref, SUMMARY_WINDOW_DAYS);
    return finished.length > 0 ? (finished.filter((t) => t.status === "CLOSE").length / finished.length) * 100 : null;
  };
  // TODO は現在の status しか持たず過去時点を復元できないので、分布のないタイルにする
  const todos = tasks.filter((t) => t.status === "TODO");
  const activeWip = todos.filter((t) => inWindow(t.last_clock_out.slice(0, 10), today, ACTIVE_WIP_DAYS)).length;

  return {
    gauges: [
      gauge(today, throughput, {
        key: "throughput", label: "スループット", desc: "DONE 数", unit: "件", higherIsBetter: true,
      }),
      gauge(today, leadTimeP85, {
        key: "lead-time", label: "リードタイム p85", desc: "DONE のリードタイム (SLE)", unit: "日", higherIsBetter: false,
      }),
      gauge(today, sloAttainment, {
        key: "slo", label: "SLO 達成率", desc: `DONE のうち ${SLO_DAYS}日以内 (目標 ${SLO_TARGET}%)`, unit: "%", higherIsBetter: true, target: SLO_TARGET,
      }),
      gauge(today, flowEfficiency, {
        key: "flow-efficiency", label: "フロー効率", desc: "DONE の実作業時間÷リードタイム (中央値)", unit: "%", higherIsBetter: true,
      }),
      gauge(today, resumeWait, {
        key: "resume-wait", label: "再開待ち時間", desc: `手を離した (${RESUME_GAP_MINUTES}分以上空いた) タスクに戻るまでの中央値`, unit: "h", higherIsBetter: false,
      }),
      gauge(today, closeRate, {
        key: "close-rate", label: "CLOSE 率", desc: "終えたタスクのうち捨てた割合", unit: "%", higherIsBetter: false,
      }),
    ],
    tiles: [
      { key: "active-wip", label: "アクティブ WIP", desc: `${ACTIVE_WIP_DAYS}日以内に CLOCK した TODO`, value: activeWip },
      { key: "stale-todo", label: "放置 TODO", desc: `${ACTIVE_WIP_DAYS}日以上触っていない TODO`, value: todos.length - activeWip },
    ],
  };
}

export function draftSummary(entries: DraftEntry[], today: string): Summary {
  // 公開日がわかるので、過去時点で下書きだったものを再現できる
  const openAt = (ref: string) => entries.filter((e) => e.created <= ref && (e.published === null || e.published > ref));
  const openCount = (ref: string) => openAt(ref).length;
  const publishLeadTime = (ref: string) => {
    const lts = entries
      .filter((e) => e.published !== null && e.lead_time_days !== null && inWindow(e.published, ref, SUMMARY_WINDOW_DAYS))
      .map((e) => e.lead_time_days!)
      .sort((a, b) => a - b);
    return lts.length > 0 ? percentile(lts, 50) : null;
  };
  const oldestAge = (ref: string) => {
    const ages = openAt(ref).map((e) => daysBetween(e.created, ref));
    return ages.length > 0 ? Math.max(...ages) : null;
  };

  return {
    gauges: [
      gauge(today, openCount, {
        key: "open-drafts", label: "未公開 Draft", desc: "現時点で draft タグが付いた記事", unit: "件", higherIsBetter: false,
      }),
      gauge(today, publishLeadTime, {
        key: "publish-lead-time", label: "公開リードタイム", desc: "公開した記事の中央値", unit: "日", higherIsBetter: false,
      }),
      gauge(today, oldestAge, {
        key: "oldest-draft", label: "最古 Draft", desc: "現時点で最も古い下書きの経過日数", unit: "日", higherIsBetter: false,
      }),
    ],
    tiles: [],
  };
}

export function activitySummary(daily: ActivityDailyEntry[], today: string): Summary {
  const inRange = (ref: string) => daily.filter((d) => inWindow(d.date, ref, SUMMARY_WINDOW_DAYS) && d.activities.length > 0);

  const hours = (ref: string) =>
    inRange(ref).reduce((s, d) => s + d.activities.reduce((m, a) => m + a.minutes, 0), 0) / 60;
  // 窓内に一度でも実施した Activity を対象とし、対象×日数のうち実施した割合
  const doneRate = (ref: string) => {
    const days = inRange(ref);
    const targets = new Set(days.flatMap((d) => d.activities.map((a) => a.title)));
    if (targets.size === 0) return null;
    const done = days.reduce((s, d) => s + new Set(d.activities.map((a) => a.title)).size, 0);
    return (done / (targets.size * SUMMARY_WINDOW_DAYS)) * 100;
  };
  const activeDays = (ref: string) => inRange(ref).length;

  return {
    gauges: [
      gauge(today, hours, {
        key: "hours", label: "投下時間", desc: "Activity の合計", unit: "h", higherIsBetter: true,
      }),
      gauge(today, doneRate, {
        key: "done-rate", label: "習慣実施率", desc: "実施した Activity × 日数のうち実施した割合", unit: "%", higherIsBetter: true,
      }),
      gauge(today, activeDays, {
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
