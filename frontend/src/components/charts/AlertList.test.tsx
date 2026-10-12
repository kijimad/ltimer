import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { AlertList } from "./AlertList.tsx";
import type { TaskRepository } from "../../data/repository.ts";
import type { Task } from "../../types/index.ts";
import { TASKS } from "../../test/fixtures.ts";
import { renderWithChakra } from "../../test/render.tsx";
import { createTestRepository, fromTasks } from "../../test/db.ts";

const GENERATED = "2024-03-20T03:00:00Z";

describe("AlertList", () => {
  it("shows TODO tasks older than 30 days while there are few DONE", () => {
    renderWithChakra(<AlertList repo={createTestRepository({ generatedAt: GENERATED, tasks: fromTasks(TASKS) }).tasks} startedAt="2024-01-01" asOf="2024-03-20" />);
    // 最初の CLOCK (02-01) から生成日 (03-20) まで
    expect(screen.getByText("48d")).toBeInTheDocument();
    expect(screen.getByText("経過日数が30日を超えた TODO")).toBeInTheDocument();
    expect(screen.getByText("Fix bug #42")).toBeInTheDocument();
  });

  it("does not show DONE/CLOSE tasks even if lead_time > 30", () => {
    renderWithChakra(<AlertList repo={createTestRepository({ generatedAt: GENERATED, tasks: fromTasks(TASKS) }).tasks} startedAt="2024-01-01" asOf="2024-03-20" />);
    expect(screen.queryByText("Implement auth")).not.toBeInTheDocument();
    expect(screen.queryByText("Write docs")).not.toBeInTheDocument();
  });

  it("shows no alerts message when none qualify", () => {
    const tasks = TASKS.filter((t) => t.status !== "TODO");
    renderWithChakra(<AlertList repo={createTestRepository({ generatedAt: GENERATED, tasks: fromTasks(tasks) }).tasks} startedAt="2024-01-01" asOf="2024-03-20" />);
    expect(screen.getByText("No alerts")).toBeInTheDocument();
  });

  it("renders from any repository implementation", () => {
    const repo = {
      leadTimePace: () => null,
      alertTodos: () => [{ title: "偽物のタスク", file: "20240101T000000--x.org", days: 99 }],
    } as unknown as TaskRepository;
    renderWithChakra(<AlertList repo={repo} startedAt="2024-01-01" asOf="2024-03-20" />);
    expect(screen.getByText("99d")).toBeInTheDocument();
    expect(screen.getByText("偽物のタスク")).toBeInTheDocument();
  });

  it("uses the p85 of past DONE lead times once there are enough", () => {
    const at = (title: string, status: Task["status"], first: string, last: string): Task => ({
      title, file: "20240101T000000--x.org", status, first_clock_in: first, last_clock_out: last,
      closed_at: null, lead_time_days: 0, total_minutes: 30, clock_count: 1, clocks: [],
    });
    // リードタイム 1日の DONE が10件なので p85 は 1日
    const done = Array.from({ length: 10 }, (_, i) => at(`done${i}`, "DONE", "2024-03-01 09:00", "2024-03-02 09:00"));
    const tasks = [...done, at("5日前に着手", "TODO", "2024-03-15 09:00", "2024-03-19 09:00"), at("今日着手", "TODO", "2024-03-20 09:00", "2024-03-20 09:30")];
    renderWithChakra(<AlertList repo={createTestRepository({ generatedAt: GENERATED, tasks: fromTasks(tasks) }).tasks} startedAt="2024-01-01" asOf="2024-03-20" />);
    expect(screen.getByText("経過日数が過去の DONE の p85 (1日)を超えた TODO")).toBeInTheDocument();
    expect(screen.getByText("5日前に着手")).toBeInTheDocument();
    expect(screen.queryByText("今日着手")).not.toBeInTheDocument();
  });
});
