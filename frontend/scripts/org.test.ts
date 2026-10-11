import { describe, it, expect } from "vitest";
import { toUtc, parseTasks, parseActivities, parseTitle, parsePublishedFromGitLog, parseDraft, WORKFLOW_FILE } from "./org.ts";

describe("toUtc", () => {
  it("treats org timestamps as JST", () => {
    expect(toUtc("2026-10-11", "15:34")).toBe("2026-10-11T06:34:00Z");
  });

  it("moves to the previous UTC day before 09:00 JST", () => {
    expect(toUtc("2026-10-11", "08:59")).toBe("2026-10-10T23:59:00Z");
  });
});

describe("parseTasks", () => {
  const org = [
    "#+title: project",
    "* TODO 機能を作る :project:日本語タグ:",
    ":LOGBOOK:",
    "CLOCK: [2026-10-10 Sat 09:00]--[2026-10-10 Sat 09:30] =>  0:30",
    "CLOCK: [2026-10-10 Sat 10:00]--[2026-10-10 Sat 10:10] =>  0:10",
    ":END:",
    "** DONE 日本語の曜日",
    "CLOSED: [2026-10-11 日 12:00]",
    "CLOCK: [2026-10-11 日 11:00]--[2026-10-11 日 11:25] =>  0:25",
    "* TODO 打刻なし",
  ].join("\r\n");
  const tasks = parseTasks("20240101T000000--p.org", org);

  it("strips tags from titles and keeps only tasks with clocks", () => {
    expect(tasks.map((t) => [t.title, t.status])).toEqual([["機能を作る", "TODO"], ["日本語の曜日", "DONE"]]);
  });

  it("drops clocks shorter than 25 minutes", () => {
    expect(tasks[0].clocks).toEqual([{ start: "2026-10-10T00:00:00Z", end: "2026-10-10T00:30:00Z", minutes: 30 }]);
  });

  it("reads Japanese weekdays and CLOSED", () => {
    expect(tasks[1].closed_at).toBe("2026-10-11T03:00:00Z");
    expect(tasks[1].clocks).toEqual([{ start: "2026-10-11T02:00:00Z", end: "2026-10-11T02:25:00Z", minutes: 25 }]);
  });

  it("ignores the workflow file", () => {
    expect(parseTasks(WORKFLOW_FILE, org)).toEqual([]);
  });
});

describe("parseActivities", () => {
  const org = [
    "* Inbox",
    "** TODO 対象外",
    "CLOCK: [2026-10-10 Sat 07:00]--[2026-10-10 Sat 07:05] =>  0:05",
    "* RepeatTasks",
    "** TODO 英語を読む 3",
    "CLOCK: [2026-10-10 Sat 08:00]--[2026-10-10 Sat 08:05] =>  0:05",
    "* Archives",
    "** DONE 英語を読む 2",
    "CLOCK: [2026-10-09 Fri 08:00]--[2026-10-09 Fri 08:30] =>  0:30",
    "** DONE 部屋を掃除する",
    "CLOCK: [2026-10-09 Fri 09:00]--[2026-10-09 Fri 09:05] =>  0:05",
    "** DONE タスク状況をレポート化する",
    "CLOCK: [2026-10-09 Fri 10:00]--[2026-10-09 Fri 10:30] =>  0:30",
  ].join("\n");
  const activities = parseActivities(org);

  it("merges rotated titles, keeps short clocks, and sorts by title", () => {
    expect(activities.map((a) => [a.title, a.clocks.length])).toEqual([["英語を読む", 2], ["部屋を掃除する", 1]]);
  });

  it("reads only RepeatTasks and Archives and skips one-off tasks", () => {
    expect(activities.map((a) => a.title)).not.toContain("対象外");
    expect(activities.map((a) => a.title)).not.toContain("タスク状況をレポート化する");
  });
});

describe("parseTitle", () => {
  it("reads #+title before the first heading", () => {
    expect(parseTitle("#+TITLE:  KDOC 1: 題\n* 見出し")).toBe("KDOC 1: 題");
    expect(parseTitle("* 見出し\n#+title: 後ろ")).toBeNull();
  });
});

describe("parsePublishedFromGitLog", () => {
  const log = [
    "2026-09-15T21:00:00+09:00",
    "",
    "R100\t20260101T000000--a__draft_book.org\t20260101T000000--a__book.org",
    "R090\t20260102T000000--b__book.org\t20260102T000000--b2__book.org",
    "2026-08-01T10:00:00+09:00",
    "",
    "R100\t20260101T000000--a__draft_x.org\t20260101T000000--a__book.org",
  ].join("\n");

  it("keeps the latest rename that removed __draft_", () => {
    expect([...parsePublishedFromGitLog(log)]).toEqual([["20260101T000000--a__book.org", "2026-09-15"]]);
  });
});

describe("parseDraft", () => {
  const published = new Map([["20260101T120000--a__book.org", "2026-01-31"]]);

  it("reads drafts from the filename", () => {
    expect(parseDraft("20260101T120000--a__draft_book.org", "#+title: A", published)).toEqual({
      file: "20260101T120000--a__draft_book.org", title: "A", created: "2026-01-01", published: null, lead_time_days: null, status: "draft",
    });
  });

  it("computes lead time for published articles", () => {
    expect(parseDraft("20260101T120000--a__book.org", "", published)).toMatchObject({ title: "20260101T120000--a__book.org", published: "2026-01-31", lead_time_days: 30 });
  });

  it("ignores files that were never drafts or have no timestamp", () => {
    expect(parseDraft("20260101T120000--z__book.org", "", published)).toBeNull();
    expect(parseDraft("index.org", "", published)).toBeNull();
  });
});
