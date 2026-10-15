import { describe, it, expect } from "vitest";
import { interruptionsByPeriod, queueTimeHistogram, throughputByPeriod, leadTimeHistogram, leadTimePercentiles, focusBlockHistogram, workByWeekdayHour, workByProject, OTHER_PROJECTS, netProfitByPeriod, wipByPeriod, cumulativeFlow, burnByDate, cashFlowByPeriod, activityByPeriod, activityByWeekdayHour, leadTimePace, taskSizeHistogram, estimates, notesInRange, notesCreatedByStatus, notesCreatedByTag, NO_TAG } from "./charts.ts";
import { rows } from "./database.ts";
import { createTestDatabase, fromTasks, fromDaily } from "../test/db.ts";
import type { Task, TaskClock } from "../types/index.ts";

function task(title: string, clocks: TaskClock[]): Task {
  return {
    title, file: "f.org", status: "DONE", first_clock_in: clocks[0].start, last_clock_out: clocks.at(-1)!.end,
    closed_at: null, lead_time_days: 0, total_minutes: 0, clock_count: clocks.length, clocks,
  };
}
const c = (start: string, end: string): TaskClock => ({ start, end, minutes: 25 });
const db = (tasks: Parameters<typeof fromTasks>[0]) => createTestDatabase({ generatedAt: "2024-03-01T03:00:00Z", tasks: fromTasks(tasks) });
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
    expect(interruptionsByPeriod(db([a, b]), "2024-01-01", "week").slice(0, 3)).toEqual([
      { period: "2024-01-01", count: 1 },
      { period: "2024-01-08", count: 1 },
      { period: "2024-01-15", count: 0 },
    ]);
    // 01-01 の週は 01-02 以降の日だけを数える
    expect(interruptionsByPeriod(db([a, b]), "2024-01-02", "week").slice(0, 2)).toEqual([
      { period: "2024-01-01", count: 0 },
      { period: "2024-01-08", count: 1 },
    ]);
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

  it("returns null points and zero overall p85 without DONE tasks", () => {
    // 暦はデータがなくても生成日の1日を持つので、その週の点は値なし
    expect(leadTimePercentiles(empty, "2024-01-01", "2024-03-01", "week")).toEqual({
      data: [{ period: "2024-02-26", p50: null, p85: null, p95: null }],
      globalP85: 0,
    });
  });
});

describe("focusBlockHistogram", () => {
  it("buckets block lengths for blocks starting on or after startedAt", () => {
    const long = task("a", [{ start: "2024-01-01 09:00", end: "2024-01-01 11:00", minutes: 120 }]);
    const short = task("b", [{ start: "2024-01-02 09:00", end: "2024-01-02 09:30", minutes: 30 }]);
    const before = task("c", [{ start: "2023-12-31 09:00", end: "2023-12-31 09:30", minutes: 30 }]);
    expect(focusBlockHistogram(db([long, short, before]), "2024-01-01")).toEqual([
      { bucket: "<1h", count: 1 },
      { bucket: "1-2h", count: 0 },
      { bucket: "2-3h", count: 1 },
      { bucket: "3-4h", count: 0 },
      { bucket: "4h+", count: 0 },
    ]);
  });
});

describe("workByWeekdayHour", () => {
  it("counts minutes at the local weekday and hour of the session start", () => {
    // 2024-01-01 は月曜。JST 08:30 は UTC では前日 (日曜) の 23:30
    const t = task("a", [{ start: "2024-01-01 08:30", end: "2024-01-01 09:00", minutes: 30 }, { start: "2024-01-07 22:00", end: "2024-01-07 22:25", minutes: 25 }]);
    expect(workByWeekdayHour(db([t]), "2024-01-01")).toEqual([
      { weekday: 0, hour: 8, minutes: 30 },
      { weekday: 6, hour: 22, minutes: 25 },
    ]);
  });

  it("counts activity sessions the same way, from startedAt", () => {
    const utc = (local: string) => new Date(local.replace(" ", "T")).toISOString();
    const clock = (start: string, minutes: number) => ({ start: utc(start), end: utc(start), minutes });
    const a = createTestDatabase({
      generatedAt: "2024-03-01T03:00:00Z",
      activities: [{ title: "read", clocks: [clock("2023-12-31 07:00", 10), clock("2024-01-01 07:10", 15), clock("2024-01-08 07:40", 5)] }],
    });
    expect(activityByWeekdayHour(a, "2024-01-01")).toEqual([{ weekday: 0, hour: 7, minutes: 20 }]);
  });
});

describe("workByProject", () => {
  const inFile = (file: string, minutes: number) => ({
    ...task(file, [{ start: "2024-01-02 09:00", end: "2024-01-02 09:25", minutes }]),
    file,
  });

  it("keeps the top 7 files as series and merges the rest into others", () => {
    const tasks = Array.from({ length: 9 }, (_, i) => inFile(`f${i}.org`, (i + 1) * 10));
    const { data, projects } = workByProject(db(tasks), "2024-01-01", "week");
    expect(projects).toEqual(["f8.org", "f7.org", "f6.org", "f5.org", "f4.org", "f3.org", "f2.org", OTHER_PROJECTS]);
    expect(data[0]).toEqual({ period: "2024-01-01", "f8.org": 90, "f7.org": 80, "f6.org": 70, "f5.org": 60, "f4.org": 50, "f3.org": 40, "f2.org": 30, [OTHER_PROJECTS]: 30 });
    // 作業のない週も全系列 0 で並ぶ
    expect(data[1]).toEqual({ period: "2024-01-08", ...Object.fromEntries(projects.map((p) => [p, 0])) });
  });

  it("orders files with the same total by name", () => {
    expect(workByProject(db([inFile("b.org", 10), inFile("a.org", 10)]), "2024-01-01", "week").projects).toEqual(["a.org", "b.org"]);
  });

  it("does not add others when there are 7 files or fewer", () => {
    expect(workByProject(db([inFile("a.org", 10)]), "2024-01-01", "month").projects).toEqual(["a.org"]);
  });
});

describe("netProfitByPeriod", () => {
  it("fills zero for periods without throughput or work", () => {
    const done = { ...task("done", [{ start: "2024-01-01 09:00", end: "2024-01-01 09:25", minutes: 25 }]), closed_at: "2024-01-01 10:00" };
    const work = { ...task("work", [{ start: "2024-01-08 09:00", end: "2024-01-08 10:30", minutes: 90 }]), status: "TODO" as const };
    const points = netProfitByPeriod(db([done, work]), "2024-01-01", "week");
    expect(points.slice(0, 2)).toEqual([
      { period: "2024-01-01", Throughput: 1, OE: 0.4 },
      { period: "2024-01-08", Throughput: 0, OE: 1.5 },
    ]);
    // 生成日 (03-01) までの、何もない週も 0 で並ぶ
    expect(points.at(-1)).toEqual({ period: "2024-02-26", Throughput: 0, OE: 0 });
  });
});

describe("throughputByPeriod", () => {
  it("returns zero for weeks without DONE", () => {
    const done = (d: string) => ({ ...task(d, [{ start: `${d} 09:00`, end: `${d} 09:25`, minutes: 25 }]), closed_at: `${d} 10:00` });
    // 01-01 の週と 01-15 の週に完了があり、01-08 の週はない
    expect(throughputByPeriod(db([done("2024-01-01"), done("2024-01-15")]), "2024-01-01", "week").slice(0, 3)).toEqual([
      { period: "2024-01-01", count: 1 },
      { period: "2024-01-08", count: 0 },
      { period: "2024-01-15", count: 1 },
    ]);
  });
});


describe("wipByPeriod", () => {
  it("counts unfinished tasks clocked within 14 days of each period end", () => {
    const stale = { ...task("stale", [c("2023-12-01 09:00", "2023-12-01 09:25")]), status: "TODO" as const };
    const active = { ...task("active", [c("2024-01-03 09:00", "2024-01-03 09:25")]), status: "TODO" as const };
    const done = { ...task("done", [c("2024-01-02 09:00", "2024-01-02 09:25")]), closed_at: "2024-01-10 10:00" };
    expect(wipByPeriod(db([stale, active, done]), "2024-01-01", "week").slice(0, 3)).toEqual([
      { period: "2024-01-01", days: 7, wip: 2, throughput: 0, avgLead: null },
      { period: "2024-01-08", days: 7, wip: 1, throughput: 1, avgLead: 0 },
      // 01-03 の CLOCK は 01-21 から見て14日より前
      { period: "2024-01-15", days: 7, wip: 0, throughput: 0, avgLead: null },
    ]);
  });

  it("counts only the days inside the range for partial periods", () => {
    const t = task("a", [c("2024-01-03 09:00", "2024-01-03 09:25")]);
    const points = wipByPeriod(db([t]), "2024-01-03", "week");
    expect(points[0].days).toBe(5);
    // 生成日 03-01 (金) で終わる
    expect(points.at(-1)).toMatchObject({ period: "2024-02-26", days: 5 });
  });
});

describe("cumulative flow", () => {
  // 範囲の前に着手して範囲内に終えたタスクと、範囲内に着手したタスク
  const tasks = [
    { ...task("carried", [c("2023-12-20 09:00", "2023-12-20 09:25")]), closed_at: "2024-01-02 10:00" },
    { ...task("new", [c("2024-01-09 09:00", "2024-01-09 09:25")]), status: "TODO" as const },
    { ...task("dropped", [c("2024-01-10 09:00", "2024-01-10 09:25")]), status: "CLOSE" as const, closed_at: "2024-01-11 10:00" },
  ];


  it("counts only the days inside the range for partial periods", () => {
    const t = task("a", [c("2024-01-03 09:00", "2024-01-03 09:25")]);
    const points = wipByPeriod(db([t]), "2024-01-03", "week");
    expect(points[0].days).toBe(5);
    // 生成日 03-01 (金) で終わる
    expect(points.at(-1)).toMatchObject({ period: "2024-02-26", days: 5 });
  });
  it("accumulates starts and completions from startedAt", () => {
    expect(cumulativeFlow(db(tasks), "2024-01-01", "week").slice(0, 3)).toEqual([
      { period: "2024-01-01", Started: 0, Completed: 1, Closed: 0 },
      { period: "2024-01-08", Started: 2, Completed: 2, Closed: 1 },
      { period: "2024-01-15", Started: 2, Completed: 2, Closed: 1 },
    ]);
    expect(cashFlowByPeriod(db(tasks), "2024-01-01", "week").slice(0, 2)).toEqual([
      { period: "2024-01-01", CashFlow: 1 },
      { period: "2024-01-08", CashFlow: 0 },
    ]);
  });

  it("pairs daily totals with the active WIP of each day", () => {
    expect(burnByDate(db(tasks), "2024-01-08").slice(0, 2)).toEqual([
      { date: "2024-01-08", Started: 0, Completed: 0, WIP: 0 },
      { date: "2024-01-09", Started: 1, Completed: 0, WIP: 1 },
    ]);
  });
});

describe("zero-filled periods", () => {
  it("fills every histogram bin with zero in weeks without DONE", () => {
    const done = (d: string) => ({ ...task(d, [c(`${d} 09:00`, `${d} 09:25`)]), closed_at: `${d} 10:00` });
    const { data, bins } = leadTimeHistogram(db([done("2024-01-01"), done("2024-01-15")]), "2024-01-01", "week");
    expect(data[1]).toEqual({ period: "2024-01-08", ...Object.fromEntries(bins.map((b) => [b, 0])) });
  });

  it("fills zero minutes for activities done in range", () => {
    const daily = [
      { date: "2023-12-01", activities: [{ title: "old", minutes: 10 }] },
      { date: "2024-01-01", activities: [{ title: "read", minutes: 30 }] },
      { date: "2024-01-15", activities: [{ title: "read", minutes: 20 }] },
    ];
    const a = createTestDatabase({ generatedAt: "2024-03-01T03:00:00Z", activities: fromDaily(daily) });
    expect(activityByPeriod(a, "2024-01-01", "week").slice(0, 3)).toEqual([
      { period: "2024-01-01", title: "read", minutes: 30 },
      { period: "2024-01-08", title: "read", minutes: 0 },
      { period: "2024-01-15", title: "read", minutes: 20 },
    ]);
  });
});

describe("leadTimePace", () => {
  /** 01-01 に着手し、lead 日後の CLOCK で終えた DONE */
  const withLead = (lead: number) => {
    const end = `2024-01-${String(1 + lead).padStart(2, "0")}`;
    return task(`d${lead}`, [c("2024-01-01 09:00", "2024-01-01 09:25"), c(`${end} 09:00`, `${end} 09:25`)]);
  };

  it("returns lead time percentiles of all DONE up to asOf", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => withLead(i + 1));
    expect(leadTimePace(db(tasks), "2024-03-01")).toEqual({ p50: 5, p70: 7, p85: 9, p95: 10 });
  });

  it("returns null with fewer than ten DONE", () => {
    expect(leadTimePace(db(Array.from({ length: 9 }, (_, i) => withLead(i + 1))), "2024-03-01")).toBeNull();
  });
});

describe("taskSizeHistogram", () => {
  it("buckets the work time of DONE finished on or after startedAt", () => {
    const done = (d: string, minutes: number) => ({ ...task(d, [{ start: `${d} 09:00`, end: `${d} 09:25`, minutes }]), closed_at: `${d} 10:00` });
    const todo = { ...task("todo", [{ start: "2024-01-02 09:00", end: "2024-01-02 09:25", minutes: 30 }]), status: "TODO" as const };
    const counts = taskSizeHistogram(db([done("2023-12-31", 30), done("2024-01-01", 59), done("2024-01-02", 60), done("2024-01-03", 1000), todo]), "2024-01-01");
    expect(counts).toEqual([
      { bucket: "<1h", count: 1 },
      { bucket: "1-2h", count: 1 },
      { bucket: "2-4h", count: 0 },
      { bucket: "4-8h", count: 0 },
      { bucket: "8-16h", count: 0 },
      { bucket: "16h+", count: 1 },
    ]);
  });
});

describe("estimates", () => {
  it("returns DONE with an Effort finished on or after startedAt", () => {
    const done = (d: string, effort: number | null) => ({
      ...task(d, [{ start: `${d} 09:00`, end: `${d} 10:00`, minutes: 60 }]), closed_at: `${d} 10:00`, effort_minutes: effort,
    });
    expect(estimates(db([done("2023-12-31", 30), done("2024-01-01", 30), done("2024-01-02", null), done("2024-01-03", 0)]), "2024-01-01")).toEqual([
      { title: "2024-01-01", effortMinutes: 30, actualMinutes: 60 },
    ]);
  });
});

describe("notes", () => {
  const note = (file: string, created: string, status: "draft" | "published", tags: string[] = [], published: string | null = status === "published" ? created : null) =>
    ({ file, title: file, created, published, lead_time_days: null, status, tags });
  const db = (notes: ReturnType<typeof note>[]) => createTestDatabase({ generatedAt: "2024-03-01T03:00:00Z", notes });
  const notes = db([
    note("old", "2023-12-31", "published", ["essay"]),
    note("a", "2024-01-01", "published", ["essay", "book"]),
    note("b", "2024-01-02", "draft", ["book"]),
    note("c", "2024-01-15", "published"),
    note("p", "2023-12-01", "published", ["essay"], "2024-01-03"),
  ]);

  it("lists notes created or published on or after startedAt, newest first, with their tags in filename order", () => {
    expect(notesInRange(notes, "2024-01-01").map((n) => [n.file, n.tags])).toEqual([["c", []], ["b", ["book"]], ["a", ["essay", "book"]], ["p", ["essay"]]]);
  });

  it("always lists drafts, even created before startedAt", () => {
    expect(notesInRange(notes, "2024-01-10").map((n) => n.file)).toEqual(["c", "b"]);
  });

  it("counts created notes per period by their status, filling empty periods", () => {
    expect(notesCreatedByStatus(notes, "2024-01-01", "week").slice(0, 3)).toEqual([
      { period: "2024-01-01", draft: 1, published: 1 },
      { period: "2024-01-08", draft: 0, published: 0 },
      { period: "2024-01-15", draft: 0, published: 1 },
    ]);
  });

  it("counts created notes per period by their first tag, with untagged notes last", () => {
    const { data, tags } = notesCreatedByTag(notes, "2024-01-01", "week");
    // 範囲内ではどのタグも1件ずつなので名前順
    expect(tags).toEqual([{ key: "tag:book", name: "book" }, { key: "tag:essay", name: "essay" }, { key: "no-tag", name: NO_TAG }]);
    expect(data.slice(0, 3)).toEqual([
      { period: "2024-01-01", "tag:book": 1, "tag:essay": 1, "no-tag": 0 },
      { period: "2024-01-08", "tag:book": 0, "tag:essay": 0, "no-tag": 0 },
      { period: "2024-01-15", "tag:book": 0, "tag:essay": 0, "no-tag": 1 },
    ]);
  });

  it("orders tags by how many notes they have", () => {
    expect(notesCreatedByTag(notes, "2023-12-01", "month").tags.map((t) => t.name)).toEqual(["essay", "book", NO_TAG]);
  });

  it("puts untagged notes last even when there are more of them", () => {
    const many = db([note("x", "2024-01-01", "published"), note("y", "2024-01-01", "published"), note("z", "2024-01-01", "published", ["book"])]);
    expect(notesCreatedByTag(many, "2024-01-01", "week").tags.map((t) => t.name)).toEqual(["book", NO_TAG]);
  });

  it("keeps tags named like the period column or the untagged series apart", () => {
    const odd = db([note("x", "2024-01-01", "published", ["period"]), note("y", "2024-01-01", "published", [NO_TAG]), note("z", "2024-01-01", "published")]);
    expect(notesCreatedByTag(odd, "2024-01-01", "week").data[0]).toEqual({ period: "2024-01-01", "tag:period": 1, [`tag:${NO_TAG}`]: 1, "no-tag": 1 });
  });
});
