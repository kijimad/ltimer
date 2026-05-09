import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileTable } from "./FileTable.tsx";
import { TASKS } from "../../test/fixtures.ts";

describe("FileTable", () => {
  it("renders aggregated rows per file", () => {
    render(<FileTable tasks={TASKS} />);
    // 2 unique files in fixtures
    const rows = screen.getAllByRole("row");
    // 1 header + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it("shows correct task counts", () => {
    render(<FileTable tasks={TASKS} />);
    // project__web.org has 2 tasks, docs__ref.org has 2 tasks
    const cells = screen.getAllByRole("cell");
    const taskCounts = cells.filter((c) => c.textContent === "2");
    expect(taskCounts.length).toBeGreaterThanOrEqual(2);
  });

  it("sorts by column header click", async () => {
    render(<FileTable tasks={TASKS} />);
    const workHeader = screen.getByText("Work(min)");
    await userEvent.click(workHeader);
    // Should toggle sort indicator
    expect(workHeader.textContent).toContain("▼");
  });
});
