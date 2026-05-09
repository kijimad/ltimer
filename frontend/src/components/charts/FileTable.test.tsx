import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileTable } from "./FileTable.tsx";
import { TASKS } from "../../test/fixtures.ts";
import { renderWithChakra } from "../../test/render.tsx";

describe("FileTable", () => {
  it("renders aggregated rows per file", () => {
    renderWithChakra(<FileTable tasks={TASKS} />);
    const rows = screen.getAllByRole("row");
    // 1 header + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it("shows correct task counts", () => {
    renderWithChakra(<FileTable tasks={TASKS} />);
    const cells = screen.getAllByRole("cell");
    const taskCounts = cells.filter((c) => c.textContent === "2");
    expect(taskCounts.length).toBeGreaterThanOrEqual(2);
  });

  it("sorts by column header click", async () => {
    renderWithChakra(<FileTable tasks={TASKS} />);
    const workHeader = screen.getByText("Work(min)");
    await userEvent.click(workHeader);
    expect(workHeader.textContent).toContain("▼");
  });
});
