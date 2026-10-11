import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { GanttChart } from "./GanttChart.tsx";
import { TASKS } from "../../test/fixtures.ts";
import { renderWithChakra } from "../../test/render.tsx";

describe("GanttChart", () => {
  it("shows a tooltip for the hovered row", () => {
    renderWithChakra(<GanttChart tasks={TASKS} startedAt="2024-01-01" asOf="2024-03-31" />);
    const svg = screen.getByRole("img", { name: "Gantt Chart" });
    // first_clock_in 順で2行目が Implement auth (軸 20px + 1行 18px の下)
    fireEvent.mouseMove(svg, { clientX: 10, clientY: 43 });
    expect(screen.getByText("2024-01-10 09:00 → 2024-01-20 17:00 (10d, DONE)")).toBeInTheDocument();
    expect(screen.getByText("2 セッション / 300 分")).toBeInTheDocument();
  });

  it("hides the tooltip when the pointer leaves", () => {
    renderWithChakra(<GanttChart tasks={TASKS} startedAt="2024-01-01" asOf="2024-03-31" />);
    const svg = screen.getByRole("img", { name: "Gantt Chart" });
    fireEvent.mouseMove(svg, { clientX: 10, clientY: 43 });
    fireEvent.mouseLeave(svg);
    expect(screen.queryByText("2 セッション / 300 分")).not.toBeInTheDocument();
  });

  it("shows the hovered session", () => {
    renderWithChakra(<GanttChart tasks={TASKS} startedAt="2024-01-01" asOf="2024-03-31" />);
    const svg = screen.getByRole("img", { name: "Gantt Chart" });
    // 1行目 Refactor DB の 01-05 09:00〜12:00。幅 600px (既定値) で 91日の軸なら x ≈ 28.7px
    fireEvent.mouseMove(svg, { clientX: 29, clientY: 25 });
    expect(screen.getByText(/セッション: 2024-01-05 09:00 →\s*12:00 \(180 分\)/)).toBeInTheDocument();
  });

  it("hides the tooltip below the last row", () => {
    renderWithChakra(<GanttChart tasks={TASKS} startedAt="2024-01-01" asOf="2024-03-31" />);
    const svg = screen.getByRole("img", { name: "Gantt Chart" });
    fireEvent.mouseMove(svg, { clientX: 10, clientY: 43 });
    fireEvent.mouseMove(svg, { clientX: 10, clientY: 500 });
    expect(screen.queryByText("2 セッション / 300 分")).not.toBeInTheDocument();
  });
});
