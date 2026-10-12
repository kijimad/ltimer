import { describe, it, expect } from "vitest";
import * as sql from "./summary.ts";
import { createTestDatabase, fromTasks, fromDaily } from "../test/db.ts";
import { addDays } from "../dates.ts";
import type { Task, DraftEntry, ActivityDailyEntry, TimeRange } from "../types/index.ts";
import type { Summary } from "../metrics.ts";

const TODAY = "2024-03-01";

/** first_clock_in を省いたときは lead_time_days から逆算し、SQL が CLOCK から計算するリードタイムと揃える */
function task(overrides: Partial<Task & { deadline: string }>): Task & { deadline?: string } {
  const lead = overrides.lead_time_days ?? 2;
  const last = overrides.last_clock_out ?? "2024-02-29 10:00";
  return {
    title: "t",
    file: "f.org",
    status: "DONE",
    first_clock_in: `${addDays(last.slice(0, 10), -lead)} 09:00`,
    last_clock_out: last,
    closed_at: "2024-02-29 10:00",
    lead_time_days: lead,
    total_minutes: 60,
    clock_count: 1,
    clocks: [],
    ...overrides,
  };
}

const GENERATED = "2024-03-01T03:00:00Z";
const taskSummary = (tasks: Task[], asOf: string, range: TimeRange) =>
  sql.taskSummary(createTestDatabase({ generatedAt: GENERATED, tasks: fromTasks(tasks) }), asOf, range);
const draftSummary = (drafts: DraftEntry[], asOf: string, range: TimeRange) =>
  sql.draftSummary(createTestDatabase({ generatedAt: GENERATED, drafts }), asOf, range);
const activitySummary = (daily: ActivityDailyEntry[], asOf: string, range: TimeRange) =>
  sql.activitySummary(
    createTestDatabase({ generatedAt: GENERATED, activities: fromDaily(daily) }),
    asOf,
    range,
  );

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

describe("taskSummary deep focus", () => {
  it("counts focus blocks of two hours or more started in the range", () => {
    const s = taskSummary([
      task({ clocks: [
        { start: "2024-02-20 09:00", end: "2024-02-20 10:00", minutes: 60 },
        // 30分後の再開なので同じブロック。合計 120分
        { start: "2024-02-20 10:30", end: "2024-02-20 11:30", minutes: 60 },
      ] }),
      task({ clocks: [{ start: "2024-02-21 09:00", end: "2024-02-21 10:59", minutes: 119 }] }),
    ], TODAY, "1m");
    expect(gauge(s, "deep-focus").value).toBe(1);
  });
});

describe("taskSummary focus ratio", () => {
  it("measures the share of block time in blocks of two hours or more", () => {
    const s = taskSummary([
      task({ clocks: [{ start: "2024-02-20 09:00", end: "2024-02-20 11:00", minutes: 120 }] }),
      // 前のセッションに含まれる30分は二重に数えない
      task({ clocks: [
        { start: "2024-02-21 09:00", end: "2024-02-21 10:00", minutes: 60 },
        { start: "2024-02-21 09:15", end: "2024-02-21 09:45", minutes: 30 },
      ] }),
    ], TODAY, "1m");
    expect(gauge(s, "focus-ratio").value).toBeCloseTo((100 * 120) / 180, 5);
  });
});

describe("taskSummary late night", () => {
  it("counts sessions started from 22:00 until before 05:00", () => {
    const s = taskSummary([
      task({ clocks: [
        { start: "2024-02-20 21:59", end: "2024-02-20 22:59", minutes: 60 },
        { start: "2024-02-20 22:00", end: "2024-02-20 22:30", minutes: 30 },
        { start: "2024-02-21 04:59", end: "2024-02-21 05:29", minutes: 30 },
        { start: "2024-02-21 05:00", end: "2024-02-21 06:00", minutes: 60 },
      ] }),
    ], TODAY, "1m");
    expect(gauge(s, "late-night").value).toBe(100 * 60 / 180);
  });
});

describe("taskSummary flow load / deadline", () => {
  const clock = (d: string) => ({ start: `${d} 09:00`, end: `${d} 09:30`, minutes: 30 });

  it("divides started tasks by finished tasks", () => {
    const s = taskSummary([
      task({ clocks: [clock("2024-02-19")], closed_at: "2024-02-20 10:00" }),
      task({ status: "TODO", closed_at: null, clocks: [clock("2024-02-21")] }),
      task({ status: "CLOSE", clocks: [clock("2024-02-22")], closed_at: "2024-02-22 10:00" }),
      task({ status: "TODO", closed_at: null, clocks: [clock("2024-02-23")] }),
    ], TODAY, "1m");
    // 着手4件、DONE と CLOSE で2件終えた
    expect(gauge(s, "flow-load").value).toBe(2);
  });

  it("measures DONE finished by their deadline among those with one", () => {
    const s = taskSummary([
      task({ clocks: [clock("2024-02-19")], closed_at: "2024-02-20 10:00", deadline: "2024-02-20" }),
      task({ clocks: [clock("2024-02-19")], closed_at: "2024-02-22 10:00", deadline: "2024-02-21" }),
      task({ clocks: [clock("2024-02-19")], closed_at: "2024-02-22 10:00" }),
    ], TODAY, "1m");
    expect(gauge(s, "deadline").value).toBe(50);
  });
});

describe("taskSummary tasks per day / density", () => {
  const session = (start: string, end: string) => ({ start, end, minutes: 60 });

  it("takes the median count of tasks touched on days with work", () => {
    const s = taskSummary([
      task({ clocks: [session("2024-02-19 09:00", "2024-02-19 10:00"), session("2024-02-20 09:00", "2024-02-20 10:00"), session("2024-02-21 09:00", "2024-02-21 10:00")] }),
      task({ clocks: [session("2024-02-19 11:00", "2024-02-19 12:00"), session("2024-02-21 11:00", "2024-02-21 12:00")] }),
      task({ clocks: [session("2024-02-21 13:00", "2024-02-21 14:00")] }),
    ], TODAY, "1m");
    // 2, 1, 3 件の中央値
    expect(gauge(s, "tasks-per-day").value).toBe(2);
  });

  it("measures clocked time within the span from the first start to the last end", () => {
    const s = taskSummary([
      task({ clocks: [session("2024-02-19 09:00", "2024-02-19 10:00"), session("2024-02-19 11:00", "2024-02-19 12:00")] }),
    ], TODAY, "1m");
    expect(gauge(s, "density").value).toBeCloseTo((100 * 120) / 180, 5);
  });

  it("caps overlapping sessions at 100%", () => {
    const s = taskSummary([
      task({ clocks: [session("2024-02-19 09:00", "2024-02-19 10:00")] }),
      task({ clocks: [session("2024-02-19 09:00", "2024-02-19 10:00")] }),
    ], TODAY, "1m");
    expect(gauge(s, "density").value).toBe(100);
  });
});

describe("taskSummary rest days / max week hours", () => {
  const session = (d: string, minutes: number) => ({ start: `${d} 09:00`, end: `${d} 09:00`, minutes });

  it("does not count days before the first task clock as rest", () => {
    // 暦は Activity の日付から始まるが、タスクの記録は 02-29 から
    const db = createTestDatabase({
      generatedAt: GENERATED,
      tasks: fromTasks([task({ clocks: [session("2024-02-29", 30)] })]),
      activities: fromDaily([{ date: "2024-02-23", activities: [{ title: "read", minutes: 10 }] }]),
    });
    // 02-29 から 03-01 のうち 03-01 だけ
    expect(gauge(sql.taskSummary(db, TODAY, "1w"), "rest-days").value).toBe(1);
  });

  it("counts days in the range without task clocks", () => {
    // 1w は 02-23 から 03-01 までの8日。作業は2日
    const s = taskSummary([task({ clocks: [session("2024-02-23", 30), session("2024-03-01", 30)] })], TODAY, "1w");
    expect(gauge(s, "rest-days").value).toBe(6);
  });

  it("takes the busiest seven days in a row in the range", () => {
    // 02-19 に 3h、02-26 と 02-27 に 5h。02-19 と 02-26 は同じ7日に入らない
    const s = taskSummary([task({ clocks: [session("2024-02-19", 180), session("2024-02-26", 120), session("2024-02-27", 180)] })], TODAY, "1m");
    expect(gauge(s, "max-week-hours").value).toBe(5);
  });

  it("counts a full seven days even when the 1w range spans two calendar weeks", () => {
    // 1w は 02-23 (金) から 03-01 (金)。毎日 2h なら7日で 14h
    const days = Array.from({ length: 8 }, (_, i) => session(addDays("2024-02-23", i), 120));
    expect(gauge(taskSummary([task({ clocks: days })], TODAY, "1w"), "max-week-hours").value).toBe(14);
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
