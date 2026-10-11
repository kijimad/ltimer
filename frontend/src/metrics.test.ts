import { describe, it, expect } from "vitest";
import { summaryPeriods, scaleFrom, bandOf, dailyRhythm, predictedLeadTime } from "./metrics.ts";

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

describe("dailyRhythm", () => {
  // 2024-01-01 (月) 〜 01-10 (水) は月・火・水が 2日、木〜日が 1日
  const cells = [
    { weekday: 0, hour: 22, minutes: 100 },
    { weekday: 3, hour: 22, minutes: 30 },
    { weekday: 6, hour: 10, minutes: 40 },
  ];
  const rhythm = dailyRhythm(cells, "2024-01-01", "2024-01-10");

  it("returns 24 hours", () => {
    expect(rhythm.map((r) => r.hour)).toEqual(Array.from({ length: 24 }, (_, h) => h));
  });

  it("averages each weekday over its own number of days", () => {
    expect(rhythm[22]).toMatchObject({ 月: 50, 木: 30, 日: 0 });
    expect(rhythm[10]).toMatchObject({ 月: 0, 日: 40 });
  });

  it("returns zero for weekdays absent from the range", () => {
    // 01-01 (月) 〜 01-02 (火) には日曜がない
    expect(dailyRhythm([{ weekday: 6, hour: 1, minutes: 10 }], "2024-01-01", "2024-01-02")[1].日).toBe(0);
  });
});

describe("predictedLeadTime", () => {
  it("divides WIP by the daily throughput so the prediction is in days", () => {
    // 1週間に7件終わるなら1日1件。WIP 3 件は3日で捌ける
    expect(predictedLeadTime({ days: 7, wip: 3, throughput: 7 })).toBe(3);
    expect(predictedLeadTime({ days: 30, wip: 2, throughput: 6 })).toBe(10);
  });

  it("returns null without completions", () => {
    expect(predictedLeadTime({ days: 7, wip: 3, throughput: 0 })).toBeNull();
  });
});
