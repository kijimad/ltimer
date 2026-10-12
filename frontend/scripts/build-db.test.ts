import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import initSqlJs from "sql.js";

// git の履歴がないディレクトリでも、改名の情報なしで DB を作れること
describe("build-db", () => {
  let tables: Record<string, unknown[][]>;

  beforeAll(async () => {
    const roam = mkdtempSync(join(tmpdir(), "ltimer-roam-"));
    writeFileSync(join(roam, "20240101T000000--project.org"), [
      "#+title: project",
      "* DONE 機能を作る",
      "CLOSED: [2024-01-02 Tue 18:00] DEADLINE: <2024-01-03 Wed>",
      ":PROPERTIES:",
      ":Effort:   1:30",
      ":END:",
      "CLOCK: [2024-01-02 Tue 09:00]--[2024-01-02 Tue 09:30] =>  0:30",
    ].join("\n"));
    writeFileSync(join(roam, "20240105T000000--memo__draft_book.org"), "#+title: 下書き\n");
    writeFileSync(join(roam, "20210904124352-workflow.org"), [
      "* RepeatTasks",
      "** TODO 英語を読む 1",
      "CLOCK: [2024-01-03 Wed 08:00]--[2024-01-03 Wed 08:05] =>  0:05",
    ].join("\n"));
    const out = join(roam, "ltimer.db");
    execFileSync(process.execPath, [join(import.meta.dirname, "build-db.ts"), roam, out], { stdio: "pipe" });

    const SQL = await initSqlJs();
    const db = new SQL.Database(readFileSync(out));
    tables = Object.fromEntries(
      ["tasks", "task_clocks", "activity_clocks", "drafts"].map((t) => [t, db.exec(`SELECT * FROM ${t}`)[0]?.values ?? []]),
    );
    expect(db.exec("SELECT value FROM meta WHERE key = 'generated_at'")[0].values[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  }, 30000);

  it("writes tasks and clocks in UTC", () => {
    expect(tables.tasks).toEqual([[0, "機能を作る", "20240101T000000--project.org", "DONE", "2024-01-02T09:00:00Z", 90, "2024-01-03"]]);
    expect(tables.task_clocks).toEqual([[0, "2024-01-02T00:00:00Z", "2024-01-02T00:30:00Z", 30]]);
  });

  it("writes activities from the workflow file", () => {
    expect(tables.activity_clocks).toEqual([["英語を読む", "2024-01-02T23:00:00Z", "2024-01-02T23:05:00Z", 5]]);
  });

  it("writes drafts", () => {
    expect(tables.drafts).toEqual([["20240105T000000--memo__draft_book.org", "下書き", "2024-01-05", null, null, "draft"]]);
  });
});
