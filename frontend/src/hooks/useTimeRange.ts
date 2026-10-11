import { useState } from "react";
import type { TimeRange, TimeUnit } from "../types/index.ts";
import { addDays, addMonths } from "../dates.ts";

export function useTimeRange() {
  const [range, setRange] = useState<TimeRange>("1m");
  return { range, setRange };
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
