import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileTable } from "./FileTable.tsx";
import { TASKS } from "../../test/fixtures.ts";
import { renderWithChakra } from "../../test/render.tsx";
import { createTestRepository, fromTasks } from "../../test/db.ts";


const REPO = createTestRepository({ generatedAt: "2024-03-20T03:00:00Z", tasks: fromTasks(TASKS) });

describe("FileTable", () => {
  it("renders aggregated rows per file", () => {
    renderWithChakra(<FileTable repo={REPO.tasks} startedAt="2024-01-01" />);
    const rows = screen.getAllByRole("row");
    // 1 header + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it("shows correct task counts", () => {
    renderWithChakra(<FileTable repo={REPO.tasks} startedAt="2024-01-01" />);
    const cells = screen.getAllByRole("cell");
    const taskCounts = cells.filter((c) => c.textContent === "2");
    expect(taskCounts.length).toBeGreaterThanOrEqual(2);
  });

  it("sorts by column header click", async () => {
    renderWithChakra(<FileTable repo={REPO.tasks} startedAt="2024-01-01" />);
    const workHeader = screen.getByText("Work(min)");
    await userEvent.click(workHeader);
    expect(workHeader.textContent).toContain("▼");
  });
});
