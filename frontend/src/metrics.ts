import type { TimeRange } from "./types/index.ts";
import { rangeDates } from "./hooks/useTimeRange.ts";
import { addDays, daysBetween } from "./dates.ts";
import type { WeekdayHourMinutes, WipPoint } from "./data/repository.ts";

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
