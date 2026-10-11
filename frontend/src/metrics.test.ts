import { describe, it, expect } from "vitest";
import { summaryPeriods, scaleFrom, bandOf } from "./metrics.ts";

describe("summaryPeriods", () => {
  it("starts with the selected range and continues with contiguous past periods", () => {
    const periods = summaryPeriods("1m", "2026-10-11", "2020-01-01");
    expect(periods).toHaveLength(13);
    expect(periods.slice(0, 3)).toEqual([
      { startedAt: "2026-09-11", finishedAt: "2026-10-11" },
      { startedAt: "2026-08-10", finishedAt: "2026-09-10" },
      { startedAt: "2026-07-09", finishedAt: "2026-08-09" },
    ]);
  });

  it("excludes past periods starting before the data", () => {
    expect(summaryPeriods("1m", "2026-10-11", "2026-08-01").map((p) => p.startedAt)).toEqual(["2026-09-11", "2026-08-10"]);
  });

  it("uses weeks for 1w", () => {
    expect(summaryPeriods("1w", "2026-10-11", "2020-01-01")[1]).toEqual({ startedAt: "2026-09-26", finishedAt: "2026-10-03" });
  });
});

describe("scaleFrom", () => {
  it("returns null for empty history", () => {
    expect(scaleFrom([])).toBeNull();
  });

  it("uses p10-p90 as range and p25/p75 as bands", () => {
    const s = scaleFrom([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])!;
    expect(s).toEqual({ min: 1, max: 9, lo: 3, hi: 8 });
    expect(bandOf(2, s)).toBe("low");
    expect(bandOf(5, s)).toBe("mid");
    expect(bandOf(9, s)).toBe("high");
  });

  it("treats values pinned to the ends as end bands", () => {
    const s = scaleFrom([40, 60, 80, 100, 100, 100, 100, 100])!;
    expect(s.hi).toBe(s.max);
    expect(bandOf(100, s)).toBe("high");
  });

  it("widens the range to include a target", () => {
    const s = scaleFrom([92, 95, 98, 100], 90)!;
    expect(s.min).toBe(90);
  });

  it("keeps a non-zero range for flat history", () => {
    const s = scaleFrom([0, 0, 0])!;
    expect(s.max).toBeGreaterThan(s.min);
  });
});
