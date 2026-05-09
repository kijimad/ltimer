import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskTable } from "./TaskTable.tsx";
import { TASKS } from "../../test/fixtures.ts";

describe("TaskTable", () => {
  it("renders all tasks", () => {
    render(<TaskTable tasks={TASKS} />);
    expect(screen.getByText("Implement auth")).toBeInTheDocument();
    expect(screen.getByText("Fix bug #42")).toBeInTheDocument();
    expect(screen.getByText("Write docs")).toBeInTheDocument();
    expect(screen.getByText("Refactor DB")).toBeInTheDocument();
  });

  it("shows status with correct class", () => {
    render(<TaskTable tasks={TASKS} />);
    const doneElements = screen.getAllByText("DONE");
    expect(doneElements[0]).toHaveClass("status-done");
  });

  it("default sorts by lead_time_days descending", () => {
    render(<TaskTable tasks={TASKS} />);
    const rows = screen.getAllByRole("row");
    // First data row should be Fix bug #42 (43 days, highest)
    expect(rows[1]).toHaveTextContent("Fix bug #42");
  });

  it("toggles sort direction on header click", async () => {
    render(<TaskTable tasks={TASKS} />);
    const header = screen.getByText(/Lead Time/);
    await userEvent.click(header);
    // Should toggle to ascending
    expect(header.textContent).toContain("▲");
  });
});
