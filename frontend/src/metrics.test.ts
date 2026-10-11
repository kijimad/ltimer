import { describe, it, expect } from "vitest";
import { taskSummary, draftSummary, activitySummary, scaleFrom, bandOf } from "./metrics.ts";
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
    ...overrides,
  };
}

function draft(overrides: Partial<DraftEntry>): DraftEntry {
  return { file: "f.org", title: "d", created: "2024-01-01", published: null, lead_time_days: null, status: "draft", ...overrides };
}

const gauge = (s: Summary, key: string) => s.gauges.find((g) => g.key === key)!;
const tile = (s: Summary, key: string) => s.tiles.find((t) => t.key === key)!;

describe("taskSummary", () => {
  it("counts only DONE completed in the last 28 days as throughput", () => {
    const s = taskSummary([
      task({ closed_at: "2024-02-03 10:00" }),
      task({ closed_at: "2024-02-02 10:00" }),
      task({ status: "CLOSE" }),
    ], TODAY);
    expect(gauge(s, "throughput").value).toBe(1);
  });

  it("samples weekly history", () => {
    const g = gauge(taskSummary([task({ closed_at: "2024-02-01 10:00" })], TODAY), "throughput");
    expect(g.history).toHaveLength(12);
    // history[i] は (i+1) 週前時点の直近28日。02-01 の完了は 3 週前 (01-06〜02-02) まで含まれる
    expect(g.history.slice(0, 5)).toEqual([1, 1, 1, 1, 0]);
  });

  it("computes p85 lead time over 28 days", () => {
    const tasks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 20].map((lt) => task({ lead_time_days: lt }));
    expect(gauge(taskSummary(tasks, TODAY), "lead-time").value).toBe(9);
  });

  it("returns null lead time when nothing is done", () => {
    expect(gauge(taskSummary([], TODAY), "lead-time").value).toBeNull();
  });

  it("computes median flow efficiency excluding same-day tasks", () => {
    const s = taskSummary([
      task({ lead_time_days: 1, total_minutes: 144 }),
      task({ lead_time_days: 0, total_minutes: 600 }),
    ], TODAY);
    expect(gauge(s, "flow-efficiency").value).toBe(10);
  });

  it("splits TODO into active and stale", () => {
    const s = taskSummary([
      task({ status: "TODO", closed_at: null, last_clock_out: "2024-02-20 10:00" }),
      task({ status: "TODO", closed_at: null, last_clock_out: "2024-01-01 10:00" }),
    ], TODAY);
    expect(tile(s, "active-wip").value).toBe(1);
    expect(tile(s, "stale-todo").value).toBe(1);
  });
});

describe("draftSummary", () => {
  const entries = [
    draft({ created: "2024-01-01" }),
    draft({ created: "2024-02-01", published: "2024-02-20", lead_time_days: 19, status: "published" }),
  ];

  it("counts drafts open at each point in time", () => {
    const g = gauge(draftSummary(entries, TODAY), "open-drafts");
    expect(g.value).toBe(1);
    expect(g.history[1]).toBe(2);
  });

  it("computes median publish lead time", () => {
    expect(gauge(draftSummary(entries, TODAY), "publish-lead-time").value).toBe(19);
  });

  it("computes oldest open draft age", () => {
    expect(gauge(draftSummary(entries, TODAY), "oldest-draft").value).toBe(60);
  });
});

describe("activitySummary", () => {
  const daily: ActivityDailyEntry[] = [
    { date: "2024-01-01", activities: [{ title: "z", minutes: 600 }] },
    { date: "2024-02-10", activities: [{ title: "x", minutes: 30 }, { title: "y", minutes: 30 }] },
    { date: TODAY, activities: [{ title: "x", minutes: 60 }] },
  ];
  const s = activitySummary(daily, TODAY);

  it("sums hours over 28 days", () => {
    expect(gauge(s, "hours").value).toBe(2);
  });

  it("computes done rate against activities done in the window", () => {
    expect(gauge(s, "done-rate").value).toBeCloseTo((3 / 56) * 100, 5);
  });

  it("counts active days", () => {
    expect(gauge(s, "active-days").value).toBe(2);
  });

  it("returns null done rate when no activity in the window", () => {
    expect(gauge(activitySummary([], TODAY), "done-rate").value).toBeNull();
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

describe("taskSummary SLO / CLOSE rate", () => {
  const tasks = [
    ...Array.from({ length: 9 }, () => task({ lead_time_days: 1 })),
    task({ lead_time_days: 10 }),
    task({ status: "CLOSE" }),
  ];
  const s = taskSummary(tasks, TODAY);

  it("computes SLO attainment over DONE tasks", () => {
    expect(gauge(s, "slo").value).toBe(90);
    expect(gauge(s, "slo").target).toBe(90);
  });

  it("computes CLOSE rate over finished tasks", () => {
    expect(gauge(s, "close-rate").value).toBeCloseTo(100 / 11, 5);
  });
});
