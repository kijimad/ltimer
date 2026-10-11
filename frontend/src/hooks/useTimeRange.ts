import { createContext, useContext } from "react";
import type { TimeRange, TimeUnit } from "../types/index.ts";
import { addDays, addMonths } from "../dates.ts";

export interface TimeRangeState {
  range: TimeRange;
  setRange: (r: TimeRange) => void;
  /** 集計範囲スイッチを描画するナビゲーションバー内の要素 */
  slot: HTMLElement | null;
}

export const TimeRangeContext = createContext<TimeRangeState | null>(null);

export function useTimeRange(): TimeRangeState {
  const state = useContext(TimeRangeContext);
  if (!state) throw new Error("useTimeRange must be used within TimeRangeProvider");
  return state;
}

export function rangeDates(range: TimeRange, asOf: string): { startedAt: string; finishedAt: string } {
  const startedAt = {
    "1w": () => addDays(asOf, -7),
    "1m": () => addMonths(asOf, -1),
    "3m": () => addMonths(asOf, -3),
    "6m": () => addMonths(asOf, -6),
  }[range]();
  return { startedAt, finishedAt: asOf };
}

export function unitForRange(range: TimeRange): TimeUnit {
  return range === "6m" ? "month" : "week";
}
