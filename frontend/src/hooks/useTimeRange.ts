import { useState } from "react";
import type { TimeRange, TimeUnit } from "../types/index.ts";

export function useTimeRange() {
  const [range, setRange] = useState<TimeRange>("3m");
  return { range, setRange };
}

export function rangeDates(range: TimeRange): { startedAt: Date; finishedAt: Date } {
  const now = new Date();
  let startedAt: Date;
  switch (range) {
    case "1w":
      startedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case "1m":
      startedAt = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case "3m":
      startedAt = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case "6m":
      startedAt = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
  }
  return { startedAt, finishedAt: now };
}

export function unitForRange(range: TimeRange): TimeUnit {
  return range === "6m" ? "month" : "week";
}
