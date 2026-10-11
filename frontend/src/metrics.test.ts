import { describe, it, expect } from "vitest";
import { taskSummary, draftSummary, activitySummary, summaryPeriods, scaleFrom, bandOf } from "./metrics.ts";
import type { Task, DraftEntry, ActivityDailyEntry } from "./types/index.ts";
import type { Summary } from "./metrics.ts";

const TODAY = "2024-03-01";

function task(overrides: Partial<Task>): Task {
  return {
    title: "t",
    file: "f.org",
    status: "DONE",
    first_clock_in: "2024-02-27 09:00",
    last_clock_out: "2024-02-29 10:00",
    closed_at: "2024-02-29 10:00",
    lead_time_days: 2,
    total_minutes: 60,
    clock_count: 1,
    clocks: [],
    ...overrides,
  };
}

function draft(overrides: Partial<DraftEntry>): DraftEntry {
  return { file: "f.org", title: "d", created: "2024-01-01", published: null, lead_time_days: null, status: "draft", ...overrides };
}

const gauge = (s: Summary, key: string) => s.gauges.find((g) => g.key === key)!;
const tile = (s: Summary, key: string) => s.tiles.find((t) => t.key === key)!;

describe("taskSummary", () => {
  it("counts only DONE completed in the selected range as throughput", () => {
    // 1m の範囲は 2024-02-01〜03-01 (両端を含む)
    const s = taskSummary([
      task({ closed_at: "2024-02-01 10:00" }),
      task({ closed_at: "2024-01-31 10:00" }),
      task({ status: "CLOSE" }),
    ], TODAY, "1m");
    expect(gauge(s, "throughput").value).toBe(1);
  });

  it("samples the same-length past periods without overlap", () => {
    const g = gauge(
      taskSummary([task({ first_clock_in: "2023-01-01 09:00" }), task({ closed_at: "2024-01-15 10:00" })], TODAY, "1m"),
      "throughput",
    );
    expect(g.history).toHaveLength(12);
    expect(g.history.slice(0, 3)).toEqual([1, 0, 0]);
  });

  it("computes p85 lead time over 28 days", () => {
    const tasks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 20].map((lt) => task({ lead_time_days: lt }));
    expect(gauge(taskSummary(tasks, TODAY, "1m"), "lead-time").value).toBe(9);
  });

  it("returns null lead time when nothing is done", () => {
    expect(gauge(taskSummary([], TODAY, "1m"), "lead-time").value).toBeNull();
  });

  it("computes median flow efficiency excluding same-day tasks", () => {
    const s = taskSummary([
      task({ lead_time_days: 1, total_minutes: 144 }),
      task({ lead_time_days: 0, total_minutes: 600 }),
    ], TODAY, "1m");
    expect(gauge(s, "flow-efficiency").value).toBe(10);
  });

  it("reports days since the last DONE and alerts beyond the usual p90 interval", () => {
    const done = (d: string) => task({ closed_at: `${d} 10:00` });
    // DONE の間隔は 1, 1, 2 日 → p90 は 2日。最後の DONE (02-25) から 03-01 までは 5日
    const s = taskSummary([done("2024-02-20"), done("2024-02-21"), done("2024-02-22"), done("2024-02-24"), done("2024-02-25")], TODAY, "1m");
    expect(tile(s, "since-last-done")).toMatchObject({ value: 5, alert: true });
    const fresh = taskSummary([done("2024-02-27"), done("2024-02-28"), done("2024-02-29")], TODAY, "1m");
    expect(tile(fresh, "since-last-done")).toMatchObject({ value: 1, alert: false });
  });

  it("does not claim a usual interval when DONE exists on only one date", () => {
    const s = taskSummary([task({ closed_at: "2024-02-01 10:00" })], TODAY, "1m");
    expect(tile(s, "since-last-done")).toMatchObject({ value: 29, alert: false, desc: "いつもの間隔はまだ測れない" });
  });

  it("omits the last DONE tile when nothing is done", () => {
    expect(taskSummary([], TODAY, "1m").tiles.map((t) => t.key)).toEqual(["active-wip"]);
  });

  it("counts TODO touched within 14 days as active WIP", () => {
    const s = taskSummary([
      // 03-01 から 13日前はアクティブ、14日前はアクティブでない
      task({ status: "TODO", closed_at: null, last_clock_out: "2024-02-17 10:00" }),
      task({ status: "TODO", closed_at: null, last_clock_out: "2024-02-16 10:00" }),
    ], TODAY, "1m");
    expect(tile(s, "active-wip").value).toBe(1);
  });
});

describe("draftSummary", () => {
  const entries = [
    draft({ created: "2023-01-01", published: "2023-02-01", lead_time_days: 31, status: "published" }),
    draft({ created: "2024-01-01" }),
    draft({ created: "2024-01-10", published: "2024-02-20", lead_time_days: 41, status: "published" }),
  ];

  it("counts articles published in the range", () => {
    const g = gauge(draftSummary(entries, TODAY, "1m"), "publish-count");
    expect(g.value).toBe(1);
    expect(g.higherIsBetter).toBe(true);
  });

  it("counts drafts open at the end of each period", () => {
    const g = gauge(draftSummary(entries, TODAY, "1m"), "open-drafts");
    expect(g.value).toBe(1);
    // 1つ前の期間の終点 01-31 では 2 本目もまだ下書き
    expect(g.history[0]).toBe(2);
  });

  it("computes median publish lead time", () => {
    expect(gauge(draftSummary(entries, TODAY, "1m"), "publish-lead-time").value).toBe(41);
  });

  it("returns null publish lead time when nothing was published in the window", () => {
    expect(gauge(draftSummary([draft({ created: "2024-01-01" })], TODAY, "1m"), "publish-lead-time").value).toBeNull();
  });

  it("computes oldest open draft age", () => {
    expect(gauge(draftSummary(entries, TODAY, "1m"), "oldest-draft").value).toBe(60);
  });
});

describe("activitySummary", () => {
  const daily: ActivityDailyEntry[] = [
    { date: "2024-01-01", activities: [{ title: "z", minutes: 600 }] },
    { date: "2024-02-10", activities: [{ title: "x", minutes: 30 }, { title: "y", minutes: 30 }] },
    { date: TODAY, activities: [{ title: "x", minutes: 60 }] },
  ];
  const s = activitySummary(daily, TODAY, "1m");

  it("sums hours over the selected range", () => {
    expect(gauge(s, "hours").value).toBe(2);
  });

  it("computes done rate against activities done in the window", () => {
    // 対象 x, y × 範囲の 30 日 (02-01〜03-01)
    expect(gauge(s, "done-rate").value).toBeCloseTo((3 / 60) * 100, 5);
  });

  it("counts active days", () => {
    expect(gauge(s, "active-days").value).toBe(2);
  });

  it("returns null done rate when no activity in the window", () => {
    expect(gauge(activitySummary([], TODAY, "1m"), "done-rate").value).toBeNull();
  });
});

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

describe("taskSummary resume wait", () => {
  it("takes the median of gaps of an hour or more resumed in the window", () => {
    const s = taskSummary([
      task({
        clocks: [
          { start: "2024-02-26 09:00", end: "2024-02-26 09:25", minutes: 25 },
          // 5分は休憩なので除外
          { start: "2024-02-26 09:30", end: "2024-02-26 09:55", minutes: 25 },
          { start: "2024-02-26 11:55", end: "2024-02-26 12:20", minutes: 25 },
          { start: "2024-02-26 16:20", end: "2024-02-26 16:45", minutes: 25 },
          { start: "2024-02-27 16:45", end: "2024-02-27 17:10", minutes: 25 },
        ],
      }),
    ], TODAY, "1m");
    // 2h, 4h, 24h の中央値
    expect(gauge(s, "resume-wait").value).toBe(4);
  });
});

describe("taskSummary SLO / CLOSE rate", () => {
  const tasks = [
    ...Array.from({ length: 9 }, () => task({ lead_time_days: 1 })),
    task({ lead_time_days: 10 }),
    task({ status: "CLOSE" }),
  ];
  const s = taskSummary(tasks, TODAY, "1m");

  it("computes SLO attainment over DONE tasks", () => {
    expect(gauge(s, "slo").value).toBe(90);
    expect(gauge(s, "slo").target).toBe(90);
  });

  it("computes CLOSE rate over finished tasks", () => {
    expect(gauge(s, "close-rate").value).toBeCloseTo(100 / 11, 5);
  });
});
