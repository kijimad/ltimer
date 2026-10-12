import type { TimeRange, TimeUnit } from "./types/index.ts";
import { rangeDates } from "./hooks/useTimeRange.ts";
import { addDays, addMonths, daysBetween } from "./dates.ts";
import type { WeekdayHourMinutes, WipPoint, LeadTimePace, Estimate } from "./data/repository.ts";

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
  /** サマリで並べる見出し */
  group?: string;
}

export interface TileMetric {
  key: string;
  label: string;
  desc: string;
  value: number;
  unit?: string;
  alert?: boolean;
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

/** チャートの絞り込みと同じく両端を含む */
export interface Period {
  startedAt: string;
  finishedAt: string;
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

export const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/** hour と、曜日のラベルごとの1日あたり平均作業時間 (分) */
export type RhythmPoint = { hour: number } & Record<(typeof WEEKDAY_LABELS)[number], number>;

/**
 * 時間帯ごとの1日あたり平均作業時間 (分) を曜日ごとに出す。範囲内の曜日の日数が違うので、合計をその曜日の日数で割る。
 * weekday は月曜を 0 とする
 */
export function dailyRhythm(cells: WeekdayHourMinutes[], startedAt: string, finishedAt: string): RhythmPoint[] {
  const days = daysBetween(startedAt, finishedAt) + 1;
  const firstWeekday = (new Date(`${startedAt}T00:00:00`).getDay() + 6) % 7;
  const count = WEEKDAY_LABELS.map((_, w) => Array.from({ length: days }, (_, i) => (firstWeekday + i) % 7).filter((x) => x === w).length);
  const minutes = new Map(cells.map((c) => [`${c.weekday}-${c.hour}`, c.minutes]));
  return Array.from({ length: 24 }, (_, hour) => {
    const point = { hour } as RhythmPoint;
    WEEKDAY_LABELS.forEach((label, w) => {
      point[label] = count[w] > 0 ? Math.round(((minutes.get(`${w}-${hour}`) ?? 0) / count[w]) * 10) / 10 : 0;
    });
    return point;
  });
}

/** リトルの法則で、期間の終わりの WIP と1日あたりのスループットからリードタイム (日) を予測する */
export function predictedLeadTime({ days, wip, throughput }: Pick<WipPoint, "days" | "wip" | "throughput">): number | null {
  return throughput > 0 ? wip / (throughput / days) : null;
}

export const PACE_BANDS = ["p50 以内", "p70 以内", "p85 以内", "p95 以内", "p95 超"] as const;

/** 経過日数が過去の DONE のリードタイムのどのパーセンタイルまでに収まるか。PACE_BANDS の添字を返す */
export function paceBand(days: number, pace: LeadTimePace): number {
  const i = [pace.p50, pace.p70, pace.p85, pace.p95].findIndex((limit) => days <= limit);
  return i === -1 ? PACE_BANDS.length - 1 : i;
}

/** 週は7日、月はその月の日数がそろい、asOf (まだ終わっていない日) より前に終わった期間 */
export function isCompletePeriod({ period, days }: Pick<WipPoint, "period" | "days">, unit: TimeUnit, asOf: string): boolean {
  if (unit === "week") return days === 7 && addDays(period, 6) < asOf;
  const [y, m] = period.split("-").map(Number);
  const length = new Date(y, m, 0).getDate();
  return days === length && `${period}-${String(length).padStart(2, "0")}` < asOf;
}

export interface ProcessLimits {
  center: number;
  upper: number;
  lower: number;
}

/** 限界線を引くのに使う、欠けのない期間の最小数 */
export const MIN_XMR_POINTS = 6;
/** 移動範囲の中央値、平均から限界線を引くときの係数 */
const XMR_SCALE = 3.14;
const XMR_MEAN_SCALE = 2.66;
const RUN_LENGTH = 8;

/** 変化の兆しの強さ。限界線の外 > 4期間のうち3期間が限界線寄り > 中心の同じ側に8期間 */
export type ProcessSignal = "limit" | "near-limit" | "run";
const SIGNAL_RANK: Record<ProcessSignal, number> = { limit: 3, "near-limit": 2, run: 1 };

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * XmR (個々の値と移動範囲) の自然な変動の限界線と、変化の兆し。
 * リードタイムは数件の長いタスクで平均が大きく振れるので、中心も移動範囲も中央値で取る。
 * 限界線は欠けのない期間だけから引き、値は負にならないので下限は 0 で止める。下限が 0 なら下側の兆しは見ない
 */
export function processBehavior(values: (number | null)[], complete: boolean[]): { limits: ProcessLimits | null; signals: (ProcessSignal | null)[] } {
  const signals: (ProcessSignal | null)[] = values.map(() => null);
  const base = values.flatMap((v, i) => (v !== null && complete[i] ? [{ i, v }] : []));
  if (base.length < MIN_XMR_POINTS) return { limits: null, signals };
  const center = median(base.map((p) => p.v));
  const ranges = base.slice(1).map((p, k) => Math.abs(p.v - base[k].v));
  // 同じ値が続くと移動範囲の中央値が 0 になり、少しでも動いた点がすべて限界線の外になるので、平均の移動範囲で引く
  const spread = median(ranges) > 0 ? XMR_SCALE * median(ranges) : XMR_MEAN_SCALE * (ranges.reduce((s, r) => s + r, 0) / ranges.length);
  const limits = { center, upper: center + spread, lower: Math.max(0, center - spread) };
  const hasLower = limits.lower > 0;
  const mark = (i: number, kind: ProcessSignal) => {
    if (signals[i] === null || SIGNAL_RANK[kind] > SIGNAL_RANK[signals[i]]) signals[i] = kind;
  };

  for (const p of base) if (p.v > limits.upper || (hasLower && p.v < limits.lower)) mark(p.i, "limit");

  // 限界線寄り = 中心より限界線に近い
  const nearUpper = (v: number) => v > (center + limits.upper) / 2;
  const nearLower = (v: number) => hasLower && v < (center + limits.lower) / 2;
  for (let k = 0; k + 4 <= base.length; k++) {
    const window = base.slice(k, k + 4);
    for (const near of [nearUpper, nearLower]) {
      const hits = window.filter((p) => near(p.v));
      if (hits.length >= 3) for (const p of hits) mark(p.i, "near-limit");
    }
  }

  let run: number[] = [];
  let runSide = 0;
  for (const p of base) {
    const side = Math.sign(p.v - center);
    // 中心ちょうどの点で連なりは切れる
    if (side !== runSide) [run, runSide] = [[], side];
    if (side === 0) continue;
    run.push(p.i);
    if (run.length >= RUN_LENGTH) for (const i of run) mark(i, "run");
  }
  return { limits, signals };
}

/** 限界線にはある程度の期間が要るので、範囲が短くても週なら26週、月なら24ヶ月はさかのぼる */
export function historyStart(startedAt: string, asOf: string, unit: TimeUnit): string {
  const history = unit === "week" ? addDays(asOf, -7 * 26) : addMonths(asOf, -24);
  return [startedAt, history].sort()[0];
}

/** 実績が見積もりのこの倍率の内に収まれば、見積もりどおりとみなす */
export const ESTIMATE_TOLERANCE = 1.25;

/** 実績÷見積もりの中央値と、見積もりどおり (÷1.25〜×1.25) だった割合 (%) */
export function estimateAccuracy(estimates: Estimate[]): { count: number; medianRatio: number; withinRate: number } | null {
  if (estimates.length === 0) return null;
  const ratios = estimates.map((e) => e.actualMinutes / e.effortMinutes);
  const within = ratios.filter((r) => r >= 1 / ESTIMATE_TOLERANCE && r <= ESTIMATE_TOLERANCE).length;
  return { count: ratios.length, medianRatio: median(ratios), withinRate: (100 * within) / ratios.length };
}
