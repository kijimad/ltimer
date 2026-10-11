import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import { StreakTable } from "./StreakTable.tsx";
import { renderWithChakra } from "../../test/render.tsx";
import type { ActivityDailyEntry } from "../../types/index.ts";
import { createTestRepository, fromDaily } from "../../test/db.ts";


const day = (date: string, titles: string[]): ActivityDailyEntry => ({ date, activities: titles.map((title) => ({ title, minutes: 5 })) });

const REPO = createTestRepository({
  generatedAt: "2024-03-03T03:00:00Z",
  activities: fromDaily([day("2024-03-01", ["x", "y"]), day("2024-03-02", ["x"]), day("2024-03-03", ["x"])]),
});

function row(title: string) {
  return within(screen.getByText(title).closest("tr") as HTMLElement);
}

describe("StreakTable", () => {
  it("counts the current streak relative to asOf", () => {
    renderWithChakra(<StreakTable repo={REPO.activities} startedAt="2024-03-01" asOf="2024-03-03" />);
    expect(row("x").getAllByText("3d")).toHaveLength(2);
  });

  it("keeps the streak alive when the last day is the day before asOf", () => {
    renderWithChakra(<StreakTable repo={REPO.activities} startedAt="2024-03-01" asOf="2024-03-04" />);
    expect(row("x").getAllByText("3d")).toHaveLength(2);
  });

  it("breaks the streak when asOf is two or more days after the last day", () => {
    renderWithChakra(<StreakTable repo={REPO.activities} startedAt="2024-03-01" asOf="2024-03-05" />);
    expect(row("x").getByText("0d")).toBeInTheDocument();
    expect(row("x").getByText("3d")).toBeInTheDocument();
  });
});
