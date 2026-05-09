import { useState } from "react";
import type { TimeRange, TimeUnit } from "../types/index.ts";

export function useTimeRange() {
  const [range, setRange] = useState<TimeRange>("3m");
  return { range, setRange };
}

export function rangeStartDate(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case "1w":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    case "1m":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  }
}

export function unitForRange(range: TimeRange): TimeUnit {
  return range === "6m" ? "month" : "week";
}
