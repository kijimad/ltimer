import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { AlertList } from "./AlertList.tsx";
import type { TaskRepository } from "../../data/repository.ts";
import { TASKS } from "../../test/fixtures.ts";
import { renderWithChakra } from "../../test/render.tsx";
import { createTestRepository, fromTasks } from "../../test/db.ts";


const GENERATED = "2024-03-20T03:00:00Z";

describe("AlertList", () => {
  it("shows TODO tasks with lead_time > 30 days", () => {
    renderWithChakra(<AlertList repo={createTestRepository({ generatedAt: GENERATED, tasks: fromTasks(TASKS) }).tasks} startedAt="2024-01-01" />);
    expect(screen.getByText("43d")).toBeInTheDocument();
    expect(screen.getByText("Fix bug #42")).toBeInTheDocument();
  });

  it("does not show DONE/CLOSE tasks even if lead_time > 30", () => {
    renderWithChakra(<AlertList repo={createTestRepository({ generatedAt: GENERATED, tasks: fromTasks(TASKS) }).tasks} startedAt="2024-01-01" />);
    expect(screen.queryByText("Implement auth")).not.toBeInTheDocument();
    expect(screen.queryByText("Write docs")).not.toBeInTheDocument();
  });

  it("shows no alerts message when none qualify", () => {
    const tasks = TASKS.filter((t) => t.status !== "TODO");
    renderWithChakra(<AlertList repo={createTestRepository({ generatedAt: GENERATED, tasks: fromTasks(tasks) }).tasks} startedAt="2024-01-01" />);
    expect(screen.getByText("No alerts")).toBeInTheDocument();
  });

  it("renders from any repository implementation", () => {
    const repo = {
      alertTodos: () => [{ title: "偽物のタスク", file: "20240101T000000--x.org", lead_time_days: 99 }],
    } as unknown as TaskRepository;
    renderWithChakra(<AlertList repo={repo} startedAt="2024-01-01" />);
    expect(screen.getByText("99d")).toBeInTheDocument();
    expect(screen.getByText("偽物のタスク")).toBeInTheDocument();
  });
});
