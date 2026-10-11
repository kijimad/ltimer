import { describe, it, expect } from "vitest";
import { interruptionsByPeriod, queueTimeHistogram, leadTimeHistogram, leadTimePercentiles, netProfitByPeriod } from "./charts.ts";
import { rows } from "./database.ts";
import { createTestDatabase, fromTasks } from "../test/db.ts";
import type { Task, TaskClock } from "../types/index.ts";

function task(title: string, clocks: TaskClock[]): Task {
  return {
    title, file: "f.org", status: "DONE", first_clock_in: clocks[0].start, last_clock_out: clocks.at(-1)!.end,
    closed_at: null, lead_time_days: 0, total_minutes: 0, clock_count: clocks.length, clocks,
  };
}
const c = (start: string, end: string): TaskClock => ({ start, end, minutes: 25 });
const db = (tasks: Task[]) => createTestDatabase({ generatedAt: "2024-03-01T03:00:00Z", tasks: fromTasks(tasks) });
const gaps = (tasks: Task[]) =>
  rows<{ resumedAt: string; minutes: number }>(db(tasks), "SELECT resumed_at AS resumedAt, minutes FROM session_gaps ORDER BY resumed_at");
/** その日 (以降の同じ週) の割り込み回数 */
const interruptionsOn = (tasks: Task[], date: string) =>
  interruptionsByPeriod(db(tasks), date, "week").reduce((s, p) => s + p.count, 0);

describe("session_gaps", () => {
  it("measures minutes between consecutive sessions", () => {
    expect(gaps([task("a", [c("2024-01-01 09:00", "2024-01-01 09:25"), c("2024-01-01 09:30", "2024-01-01 09:55"), c("2024-01-02 09:00", "2024-01-02 09:25")])])).toEqual([
      { resumedAt: "2024-01-01 09:30", minutes: 5 },
      { resumedAt: "2024-01-02 09:00", minutes: 23 * 60 + 5 },
    ]);
  });

  it("clamps overlapping sessions to zero", () => {
    expect(gaps([task("a", [c("2024-01-01 09:00", "2024-01-01 10:00"), c("2024-01-01 09:30", "2024-01-01 10:30")])])[0].minutes).toBe(0);
  });

  it("measures from the latest end when a session is nested in a longer one", () => {
    const t = task("a", [c("2024-01-01 09:00", "2024-01-01 12:00"), c("2024-01-01 10:00", "2024-01-01 10:30"), c("2024-01-01 13:00", "2024-01-01 13:25")]);
    expect(gaps([t]).map((g) => g.minutes)).toEqual([0, 60]);
  });

  it("returns no gaps for a single session", () => {
    expect(gaps([task("a", [c("2024-01-01 09:00", "2024-01-01 09:25")])])).toEqual([]);
  });
});

describe("interruptionsByPeriod", () => {
  it("counts returns to a task after switching away on the same day", () => {
    const a = task("A", [c("2024-01-01 09:00", "2024-01-01 09:25"), c("2024-01-01 11:00", "2024-01-01 11:25"), c("2024-01-01 13:00", "2024-01-01 13:25")]);
    const b = task("B", [c("2024-01-01 10:00", "2024-01-01 10:25"), c("2024-01-01 12:00", "2024-01-01 12:25")]);
    // A B A B A → 2回目以降の A, B, A の 3 回
    expect(interruptionsOn([a, b], "2024-01-01")).toBe(3);
  });

  it("does not count consecutive sessions of the same task", () => {
    const a = task("A", [c("2024-01-01 09:00", "2024-01-01 09:25"), c("2024-01-01 09:30", "2024-01-01 09:55")]);
    const b = task("B", [c("2024-01-01 10:00", "2024-01-01 10:25")]);
    expect(interruptionsOn([a, b], "2024-01-01")).toBe(0);
  });

  it("distinguishes different tasks with the same title", () => {
    const a1 = task("Review", [c("2024-01-01 09:00", "2024-01-01 09:25")]);
    const b = task("B", [c("2024-01-01 10:00", "2024-01-01 10:25")]);
    const a2 = task("Review", [c("2024-01-01 11:00", "2024-01-01 11:25")]);
    expect(interruptionsOn([a1, b, a2], "2024-01-01")).toBe(0);
  });

  it("does not carry tasks over to the next day", () => {
    const a = task("A", [c("2024-01-01 09:00", "2024-01-01 09:25"), c("2024-01-02 11:00", "2024-01-02 11:25")]);
    const b = task("B", [c("2024-01-02 10:00", "2024-01-02 10:25")]);
    expect(interruptionsOn([a, b], "2024-01-02")).toBe(0);
  });

  it("sums interruptions per week from startedAt", () => {
    const a = task("A", [
      c("2024-01-01 09:00", "2024-01-01 09:25"), c("2024-01-01 11:00", "2024-01-01 11:25"),
      c("2024-01-08 09:00", "2024-01-08 09:25"), c("2024-01-08 11:00", "2024-01-08 11:25"),
    ]);
    const b = task("B", [c("2024-01-01 10:00", "2024-01-01 10:25"), c("2024-01-08 10:00", "2024-01-08 10:25")]);
    expect(interruptionsByPeriod(db([a, b]), "2024-01-01", "week")).toEqual([
      { period: "2024-01-01", count: 1 },
      { period: "2024-01-08", count: 1 },
    ]);
    expect(interruptionsByPeriod(db([a, b]), "2024-01-02", "week")).toEqual([{ period: "2024-01-08", count: 1 }]);
  });
});

describe("queueTimeHistogram", () => {
  it("buckets gaps resumed on or after startedAt", () => {
    const t = task("a", [
      // 12-31 に再開した間隔は startedAt より前なので数えない
      c("2023-12-30 09:00", "2023-12-30 09:25"),
      c("2023-12-31 09:00", "2023-12-31 09:25"),
      // 12-31 09:25 → 01-01 09:00 (23h35m) は再開が startedAt 以降なので数える
      c("2024-01-01 09:00", "2024-01-01 09:25"),
      c("2024-01-01 09:30", "2024-01-01 09:55"),
      c("2024-01-01 12:00", "2024-01-01 12:25"),
    ]);
    const counts = Object.fromEntries(queueTimeHistogram(db([t]), "2024-01-01").map((b) => [b.bucket, b.count]));
    expect(counts).toMatchObject({ "<1h (休憩)": 1, "1-6h": 1, "6-24h": 1, "1-3d": 0 });
  });

  it("puts exactly one hour into the first non-break bucket", () => {
    const t = task("a", [c("2024-01-01 09:00", "2024-01-01 09:25"), c("2024-01-01 10:25", "2024-01-01 10:50")]);
    expect(queueTimeHistogram(db([t]), "2024-01-01")[1]).toEqual({ bucket: "1-6h", count: 1 });
  });
});

describe("empty ranges", () => {
  const empty = createTestDatabase({ generatedAt: "2024-03-01T03:00:00Z" });

  it("returns no histogram bins without DONE tasks", () => {
    expect(leadTimeHistogram(empty, "2024-01-01", "week")).toEqual({ data: [], bins: [] });
  });

  it("returns zero overall p85 without DONE tasks", () => {
    expect(leadTimePercentiles(empty, "2024-01-01", "week")).toEqual({ data: [], globalP85: 0 });
  });
});

describe("netProfitByPeriod", () => {
  it("fills zero where a period has only throughput or only work", () => {
    const done = { ...task("done", [{ start: "2024-01-01 09:00", end: "2024-01-01 09:25", minutes: 25 }]), closed_at: "2024-01-01 10:00" };
    const work = { ...task("work", [{ start: "2024-01-08 09:00", end: "2024-01-08 10:30", minutes: 90 }]), status: "TODO" as const };
    expect(netProfitByPeriod(db([done, work]), "2024-01-01", "week")).toEqual([
      { period: "2024-01-01", Throughput: 1, OE: 0.4 },
      { period: "2024-01-08", Throughput: 0, OE: 1.5 },
    ]);
  });
});

