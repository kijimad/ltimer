import { useState, type ReactNode } from "react";
import type { TimeRange } from "../types/index.ts";
import { TimeRangeContext } from "../hooks/useTimeRange.ts";

export function TimeRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<TimeRange>("1m");
  return <TimeRangeContext.Provider value={{ range, setRange }}>{children}</TimeRangeContext.Provider>;
}
