import { describe, it, expect } from "vitest";
import {
  summaryPeriods, scaleFrom, bandOf, dailyRhythm, predictedLeadTime, paceBand, isCompletePeriod, processBehavior,
  historyStart, estimateAccuracy,
} from "./metrics.ts";

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

describe("paceBand", () => {
  const pace = { p50: 2, p70: 5, p85: 10, p95: 20 };

  it("puts days on a percentile into that band", () => {
    expect([0, 2, 3, 5, 10, 20, 21].map((d) => paceBand(d, pace))).toEqual([0, 0, 1, 1, 2, 3, 4]);
  });
});

describe("isCompletePeriod", () => {
  it("needs every day of the week or the month", () => {
    expect(isCompletePeriod({ period: "2024-01-01", days: 7 }, "week", "2024-03-01")).toBe(true);
    expect(isCompletePeriod({ period: "2024-01-01", days: 5 }, "week", "2024-03-01")).toBe(false);
    expect(isCompletePeriod({ period: "2024-02", days: 29 }, "month", "2024-03-01")).toBe(true);
    expect(isCompletePeriod({ period: "2023-02", days: 29 }, "month", "2024-03-01")).toBe(false);
  });

  it("does not count a period ending on asOf, which is not over yet", () => {
    // 2024-03-03 (日) で終わる週と、3月
    expect(isCompletePeriod({ period: "2024-02-26", days: 7 }, "week", "2024-03-03")).toBe(false);
    expect(isCompletePeriod({ period: "2024-02-26", days: 7 }, "week", "2024-03-04")).toBe(true);
    expect(isCompletePeriod({ period: "2024-03", days: 31 }, "month", "2024-03-31")).toBe(false);
  });
});

describe("processBehavior", () => {
  const all = (n: number) => Array.from({ length: n }, () => true);
  /** 兆しを1文字で並べる。L=限界線の外、N=限界線寄り、R=同じ側の連なり */
  const flags = (values: number[]) =>
    processBehavior(values, all(values.length)).signals.map((s) => ({ limit: "L", "near-limit": "N", run: "R" })[s!] ?? "-").join("");

  it("draws limits at the median plus and minus 3.14 median moving ranges", () => {
    // 中央値 11、移動範囲はすべて 2
    expect(processBehavior([10, 12, 10, 12, 10, 12], all(6)).limits).toEqual({ center: 11, upper: 11 + 3.14 * 2, lower: 11 - 3.14 * 2 });
    expect(processBehavior([4, 6, 4, 6, 4, 6], all(6)).limits!.lower).toBe(0);
  });

  it("keeps a few long values from moving the center", () => {
    expect(processBehavior([1, 1, 2, 1, 70, 60, 1, 2], all(8)).limits!.center).toBe(1.5);
  });

  it("flags points beyond the upper or the lower limit", () => {
    expect(flags([5, 5, 6, 5, 5, 6, 30])).toBe("------L");
    // 中央値 20、下限 16.86
    expect(flags([20, 21, 20, 21, 20, 21, 15, 15, 20, 15])).toBe("------LL-L");
  });

  it("flags three of four points closer to a limit than to the center", () => {
    // 中央値 6、上限 9.14。9 は中心より上限に近い
    expect(flags([5, 6, 5, 6, 5, 6, 9, 9, 5, 9, 5, 6])).toBe("------NN-N--");
  });

  it("does not look for signals below a lower limit clamped at zero", () => {
    // 中央値 3。下限は負になるので 0 で止まり、0 が続いても限界線寄りとはみなさない
    expect(flags([0, 0, 3, 0, 3, 3, 4, 0, 6, 3])).toBe("-".repeat(10));
  });

  it("leaves partial periods out of the limits and the signals", () => {
    const values = [0, 4, 6, 4, 6, 4, 6, 100];
    const { limits, signals } = processBehavior(values, [false, ...all(6), false]);
    expect(limits!.center).toBe(5);
    expect(signals.every((x) => x === null)).toBe(true);
  });

  it("flags eight periods or more in a row on the same side of the center", () => {
    // 中央値 6。下の側の7期間は兆しにならず、上の側の9期間がなる
    expect(flags([3, 1, 3, 1, 3, 1, 3, 9, 10, 9, 10, 9, 10, 9, 10, 9, 1, 3])).toBe("-------RRRRRRRRR--");
  });

  it("restarts the run at a point on the center", () => {
    // 中央値 5。5 の点で下の側の連なりが4期間ずつに切れる
    expect(flags([1, 3, 1, 3, 5, 1, 3, 1, 3, 9, 7, 9, 7, 5, 7, 9, 7])).toBe("-".repeat(17));
  });

  it("falls back to the average moving range when the median moving range is zero", () => {
    // 移動範囲は 0,0,1,1,0,0,2,2,0 で中央値 0、平均 2/3。上限は 2.66 × 2/3
    const { limits } = processBehavior([0, 0, 0, 1, 0, 0, 0, 2, 0, 0], all(10));
    expect(limits!.upper).toBeCloseTo((2.66 * 6) / 9, 10);
    expect(flags([0, 0, 0, 1, 0, 0, 0, 2, 0, 0])).toBe("-------L--");
  });

  it("does not draw limits from too few complete periods", () => {
    expect(processBehavior([1, 2, 3, 4, 5, null], all(6))).toEqual({ limits: null, signals: [null, null, null, null, null, null] });
  });
});

describe("historyStart", () => {
  it("goes back at least 26 weeks or 24 months", () => {
    expect(historyStart("2026-10-05", "2026-10-12", "week")).toBe("2026-04-13");
    expect(historyStart("2026-04-12", "2026-10-12", "month")).toBe("2024-10-12");
    expect(historyStart("2020-01-01", "2026-10-12", "week")).toBe("2020-01-01");
  });
});

describe("estimateAccuracy", () => {
  const e = (effortMinutes: number, actualMinutes: number) => ({ title: "t", effortMinutes, actualMinutes });

  it("takes the median of actual over estimate and the share within 1.25 times either way", () => {
    // 比は 0.5, 0.8, 1, 1.25, 3
    expect(estimateAccuracy([e(60, 30), e(60, 48), e(60, 60), e(60, 75), e(60, 180)])).toEqual({ count: 5, medianRatio: 1, withinRate: 60 });
  });

  it("returns null without estimates", () => {
    expect(estimateAccuracy([])).toBeNull();
  });
});
