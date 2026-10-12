import { describe, it, expect } from "vitest";
import { tasksInRange, dailyWorkInRange } from "./charts.ts";
import { rows } from "./database.ts";
import { RESUME_GAP_MINUTES } from "./metricDefs.ts";
import { createTestDatabase } from "../test/db.ts";
import type { TaskRow } from "./rows.ts";

// テストは TZ=Asia/Tokyo で実行する (vite.config.ts の test.env)
const ALL = "2000-01-01";

function rawTask(overrides: Partial<TaskRow>): TaskRow {
  return { title: "t", file: "f.org", status: "DONE", closed_at: null, effort_minutes: null, deadline: null, clocks: [], ...overrides };
}

describe("views over tasks", () => {
  const db = createTestDatabase({
    generatedAt: "2024-03-01T03:00:00Z",
    tasks: [
      rawTask({
        title: "a",
        closed_at: "2024-02-02T09:00:00Z",
        clocks: [
          // JST 2024-02-01 23:30〜02-02 00:30。開始時点のローカル日付 (02-01) に振り分ける
          { start: "2024-02-01T14:30:00Z", end: "2024-02-01T15:30:00Z", minutes: 60 },
          { start: "2024-02-02T09:00:00Z", end: "2024-02-02T09:30:00Z", minutes: 30 },
        ],
      }),
      rawTask({
        title: "b",
        clocks: [{ start: "2024-01-01T00:00:00Z", end: "2024-01-06T00:00:00Z", minutes: 25 }],
      }),
    ],
  });
  const tasks = tasksInRange(db, ALL);
  const a = tasks.find((t) => t.title === "a")!;

  it("converts UTC instants to local wall-clock time", () => {
    expect(a.first_clock_in).toBe("2024-02-01 23:30");
    expect(a.last_clock_out).toBe("2024-02-02 18:30");
    expect(a.closed_at).toBe("2024-02-02 18:00");
  });

  it("derives lead time from local dates", () => {
    expect(a.lead_time_days).toBe(1);
  });

  it("keeps local clocks sorted by start", () => {
    expect(a.clocks).toEqual([
      { start: "2024-02-01 23:30", end: "2024-02-02 00:30", minutes: 60 },
      { start: "2024-02-02 18:00", end: "2024-02-02 18:30", minutes: 30 },
    ]);
  });

  it("sums minutes and counts clocks", () => {
    expect(a.total_minutes).toBe(90);
    expect(a.clock_count).toBe(2);
  });

  it("sorts tasks by lead time descending", () => {
    expect(tasks.map((t) => t.title)).toEqual(["b", "a"]);
  });

  it("buckets daily work by local date of clock start", () => {
    expect(dailyWorkInRange(db, ALL)).toEqual([
      { date: "2024-01-01", tasks: [{ title: "b", minutes: 25 }] },
      { date: "2024-02-01", tasks: [{ title: "a", minutes: 60 }] },
      { date: "2024-02-02", tasks: [{ title: "a", minutes: 30 }] },
    ]);
  });
});

describe("views over activities", () => {
  it("buckets activity minutes by local date", () => {
    const db = createTestDatabase({
      generatedAt: "2024-03-01T03:00:00Z",
      activities: [
        { title: "x", clocks: [
          // JST 2024-02-02 00:10 なので UTC では前日だがローカルでは 02-02
          { start: "2024-02-01T15:10:00Z", end: "2024-02-01T15:15:00Z", minutes: 5 },
          { start: "2024-02-02T03:00:00Z", end: "2024-02-02T03:30:00Z", minutes: 30 },
        ] },
        { title: "w", clocks: [{ start: "2024-02-02T04:00:00Z", end: "2024-02-02T04:05:00Z", minutes: 5 }] },
      ],
    });
    expect(rows(db, "SELECT date, title, minutes FROM activity_daily ORDER BY date, title")).toEqual([
      { date: "2024-02-02", title: "w", minutes: 5 },
      { date: "2024-02-02", title: "x", minutes: 35 },
    ]);
  });
});

describe("focus_blocks", () => {
  const c = (start: string, end: string, minutes = 25) => ({ start, end, minutes });
  const blocks = (clocks: ReturnType<typeof c>[]) =>
    rows(
      createTestDatabase({ generatedAt: "2024-03-01T03:00:00Z", tasks: [rawTask({ clocks })] }),
      "SELECT start, end, minutes, sessions FROM focus_blocks ORDER BY start",
    );

  it("splits blocks at the same gap as RESUME_GAP_MINUTES", () => {
    // views.sql は閾値を数値で書いているので、定数を変えたときにずれないよう検査する
    const at = (minutes: number) => new Date(Date.UTC(2024, 0, 1, 0, 25) + minutes * 60000).toISOString();
    const split = (gap: number) => blocks([c("2024-01-01T00:00:00Z", "2024-01-01T00:25:00Z"), c(at(gap), at(gap + 25))]).length;
    expect(split(RESUME_GAP_MINUTES - 1)).toBe(1);
    expect(split(RESUME_GAP_MINUTES)).toBe(2);
  });

  it("joins sessions resumed within 60 minutes and splits at 60 minutes", () => {
    // JST 09:00〜09:25, 10:24〜10:49 (59分後), 11:49〜12:14 (60分後)
    expect(blocks([
      c("2024-01-01T00:00:00Z", "2024-01-01T00:25:00Z"),
      c("2024-01-01T01:24:00Z", "2024-01-01T01:49:00Z"),
      c("2024-01-01T02:49:00Z", "2024-01-01T03:14:00Z"),
    ])).toEqual([
      { start: "2024-01-01 09:00", end: "2024-01-01 10:49", minutes: 50, sessions: 2 },
      { start: "2024-01-01 11:49", end: "2024-01-01 12:14", minutes: 25, sessions: 1 },
    ]);
  });

  it("does not double count a session nested in a longer one", () => {
    // 09:00〜12:00 の中に 10:00〜10:30。次の 12:30 は 12:00 から 30分後なので同じブロックで、作業は 180 + 30 分
    expect(blocks([
      c("2024-01-01T00:00:00Z", "2024-01-01T03:00:00Z", 180),
      c("2024-01-01T01:00:00Z", "2024-01-01T01:30:00Z", 30),
      c("2024-01-01T03:30:00Z", "2024-01-01T04:00:00Z", 30),
    ])).toEqual([{ start: "2024-01-01 09:00", end: "2024-01-01 13:00", minutes: 210, sessions: 3 }]);
  });

  it("counts only the part after the previous end when sessions partly overlap", () => {
    // 09:00〜10:00 と 09:30〜10:30 は、重ならない 10:00〜10:30 だけを足して 90 分
    expect(blocks([
      c("2024-01-01T00:00:00Z", "2024-01-01T01:00:00Z", 60),
      c("2024-01-01T00:30:00Z", "2024-01-01T01:30:00Z", 60),
    ])).toEqual([{ start: "2024-01-01 09:00", end: "2024-01-01 10:30", minutes: 90, sessions: 2 }]);
  });
});

describe("calendar and daily_task_facts", () => {
  const db = createTestDatabase({
    generatedAt: "2024-01-10T03:00:00Z",
    tasks: [
      // JST 01-03 (水) に開始、01-05 (金) に完了
      rawTask({ title: "done", closed_at: "2024-01-05T03:00:00Z", clocks: [{ start: "2024-01-03T00:00:00Z", end: "2024-01-03T01:00:00Z", minutes: 60 }] }),
      rawTask({ title: "close", status: "CLOSE", closed_at: "2024-01-05T05:00:00Z", clocks: [{ start: "2024-01-04T00:00:00Z", end: "2024-01-04T00:30:00Z", minutes: 30 }] }),
    ],
  });

  it("lists every date from the first data date to the generated date", () => {
    const days = rows<{ date: string; week: string; month: string; weekday: number }>(db, "SELECT * FROM calendar ORDER BY date");
    expect(days.map((d) => d.date)).toEqual(["2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06", "2024-01-07", "2024-01-08", "2024-01-09", "2024-01-10"]);
    expect(days[0]).toEqual({ date: "2024-01-03", week: "2024-01-01", month: "2024-01", weekday: 2 });
    expect(days[5]).toMatchObject({ date: "2024-01-08", week: "2024-01-08", weekday: 0 });
  });

  it("has one row per date with zeros for empty days", () => {
    expect(rows(db, "SELECT * FROM daily_task_facts WHERE date <= '2024-01-06' ORDER BY date")).toEqual([
      { date: "2024-01-03", started: 1, done: 0, closed: 0, work_minutes: 60 },
      { date: "2024-01-04", started: 1, done: 0, closed: 0, work_minutes: 30 },
      { date: "2024-01-05", started: 0, done: 1, closed: 1, work_minutes: 0 },
      { date: "2024-01-06", started: 0, done: 0, closed: 0, work_minutes: 0 },
    ]);
  });
});

