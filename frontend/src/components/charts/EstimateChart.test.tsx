import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { EstimateChart } from "./EstimateChart.tsx";
import type { TaskRepository, Estimate } from "../../data/repository.ts";
import { renderWithChakra } from "../../test/render.tsx";

const repoWith = (estimates: Estimate[]) => ({ estimates: () => estimates }) as unknown as TaskRepository;

describe("EstimateChart", () => {
  it("summarizes the ratio of actual to estimate", () => {
    renderWithChakra(<EstimateChart repo={repoWith([
      { title: "a", effortMinutes: 60, actualMinutes: 60 },
      { title: "b", effortMinutes: 60, actualMinutes: 180 },
    ])} startedAt="2026-01-01" />);
    expect(screen.getByText("2件 / 実績÷見積もりの中央値 2倍 / 見積もりどおり (÷1.25〜×1.25) 50%")).toBeInTheDocument();
  });

  it("shows no data without estimates in the range", () => {
    renderWithChakra(<EstimateChart repo={repoWith([])} startedAt="2026-01-01" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });
});
