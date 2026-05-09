import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskTable } from "./TaskTable.tsx";
import { TASKS } from "../../test/fixtures.ts";
import { renderWithChakra } from "../../test/render.tsx";

describe("TaskTable", () => {
  it("renders all tasks", () => {
    renderWithChakra(<TaskTable tasks={TASKS} />);
    expect(screen.getByText("Implement auth")).toBeInTheDocument();
    expect(screen.getByText("Fix bug #42")).toBeInTheDocument();
    expect(screen.getByText("Write docs")).toBeInTheDocument();
    expect(screen.getByText("Refactor DB")).toBeInTheDocument();
  });

  it("shows status badges", () => {
    renderWithChakra(<TaskTable tasks={TASKS} />);
    const doneElements = screen.getAllByText("DONE");
    expect(doneElements.length).toBeGreaterThanOrEqual(1);
  });

  it("default sorts by lead_time_days descending", () => {
    renderWithChakra(<TaskTable tasks={TASKS} />);
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Fix bug #42");
  });

  it("toggles sort direction on header click", async () => {
    renderWithChakra(<TaskTable tasks={TASKS} />);
    const header = screen.getByText(/Lead Time/);
    await userEvent.click(header);
    expect(header.textContent).toContain("▲");
  });
});
