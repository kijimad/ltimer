import { describe, it, expect } from "vitest";
import { normalizeWorkflow, normalizeActivity } from "./normalize.ts";
import type { RawTask } from "./types/index.ts";

// テストは TZ=Asia/Tokyo で実行する (vite.config.ts の test.env)

function rawTask(overrides: Partial<RawTask>): RawTask {
  return { title: "t", file: "f.org", status: "DONE", closed_at: null, clocks: [], ...overrides };
}

describe("normalizeWorkflow", () => {
  const data = normalizeWorkflow({
    generated_at: "2024-03-01T03:00:00Z",
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
  const a = data.tasks.find((t) => t.title === "a")!;

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
    expect(data.tasks.map((t) => t.title)).toEqual(["b", "a"]);
  });

  it("buckets daily work by local date of clock start", () => {
    expect(data.daily_work).toEqual([
      { date: "2024-01-01", tasks: [{ title: "b", minutes: 25 }] },
      { date: "2024-02-01", tasks: [{ title: "a", minutes: 60 }] },
      { date: "2024-02-02", tasks: [{ title: "a", minutes: 30 }] },
    ]);
  });
});

describe("normalizeActivity", () => {
  it("buckets activity minutes by local date", () => {
    const data = normalizeActivity({
      generated_at: "2024-03-01T03:00:00Z",
      activities: [
        { title: "x", clocks: [
          // JST 2024-02-02 00:10 なので UTC では前日だがローカルでは 02-02
          { start: "2024-02-01T15:10:00Z", end: "2024-02-01T15:15:00Z", minutes: 5 },
          { start: "2024-02-02T03:00:00Z", end: "2024-02-02T03:30:00Z", minutes: 30 },
        ] },
        { title: "w", clocks: [{ start: "2024-02-02T04:00:00Z", end: "2024-02-02T04:05:00Z", minutes: 5 }] },
      ],
    });
    expect(data.daily).toEqual([
      { date: "2024-02-02", activities: [{ title: "w", minutes: 5 }, { title: "x", minutes: 35 }] },
    ]);
  });
});
