import { describe, it, expect } from "vitest";
import { rangeDates, unitForRange } from "./useTimeRange.ts";

describe("rangeDates", () => {
  it.each([
    ["1w", "2026-10-04"],
    ["1m", "2026-09-11"],
    ["3m", "2026-07-11"],
    ["6m", "2026-04-11"],
  ] as const)("ends at asOf and starts %s before", (range, startedAt) => {
    expect(rangeDates(range, "2026-10-11")).toEqual({ startedAt, finishedAt: "2026-10-11" });
  });
});

describe("unitForRange", () => {
  it("uses month only for 6m", () => {
    expect(unitForRange("6m")).toBe("month");
    expect(unitForRange("3m")).toBe("week");
  });
});
