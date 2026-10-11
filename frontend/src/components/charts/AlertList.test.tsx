import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { AlertList } from "./AlertList.tsx";
import { TASKS } from "../../test/fixtures.ts";
import { renderWithChakra } from "../../test/render.tsx";
import { createTestDatabase, fromTasks } from "../../test/db.ts";


const GENERATED = "2024-03-20T03:00:00Z";

describe("AlertList", () => {
  it("shows TODO tasks with lead_time > 30 days", () => {
    renderWithChakra(<AlertList db={createTestDatabase({ generatedAt: GENERATED, tasks: fromTasks(TASKS) })} startedAt="2024-01-01" />);
    expect(screen.getByText("43d")).toBeInTheDocument();
    expect(screen.getByText("Fix bug #42")).toBeInTheDocument();
  });

  it("does not show DONE/CLOSE tasks even if lead_time > 30", () => {
    renderWithChakra(<AlertList db={createTestDatabase({ generatedAt: GENERATED, tasks: fromTasks(TASKS) })} startedAt="2024-01-01" />);
    expect(screen.queryByText("Implement auth")).not.toBeInTheDocument();
    expect(screen.queryByText("Write docs")).not.toBeInTheDocument();
  });

  it("shows no alerts message when none qualify", () => {
    const tasks = TASKS.filter((t) => t.status !== "TODO");
    renderWithChakra(<AlertList db={createTestDatabase({ generatedAt: GENERATED, tasks: fromTasks(tasks) })} startedAt="2024-01-01" />);
    expect(screen.getByText("No alerts")).toBeInTheDocument();
  });
});
