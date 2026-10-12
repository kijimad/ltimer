import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { SummaryRow } from "./SummaryRow.tsx";
import { renderWithChakra } from "../test/render.tsx";
import type { GaugeMetric } from "../metrics.ts";

const tile = (alert: boolean) => ({ key: "k", label: "最後の DONE から", desc: "", value: 5, unit: "日", alert });
const gauge = (key: string, group: string | undefined, value: number | null, history: number[] = []): GaugeMetric => ({
  key, label: key, desc: "", unit: "", value, history, higherIsBetter: true, group,
});

describe("SummaryRow", () => {
  it("renders tile value with its unit", () => {
    renderWithChakra(<SummaryRow summary={{ gauges: [], tiles: [tile(false)] }} />);
    expect(screen.getByText((_, el) => el?.textContent === "5日" && el.tagName === "P")).toBeInTheDocument();
  });

  // happy-dom は Chakra のスタイルを計算しないので、警告色の有無でクラスが変わることを確かめる
  it("styles the tile value differently when alerting", () => {
    const value = () => screen.getByText((_, el) => el?.textContent === "5日" && el.tagName === "P");
    const { unmount } = renderWithChakra(<SummaryRow summary={{ gauges: [], tiles: [tile(false)] }} />);
    const normal = value().className;
    unmount();
    renderWithChakra(<SummaryRow summary={{ gauges: [], tiles: [tile(true)] }} />);
    expect(value().className).not.toBe(normal);
  });

  it("puts gauges under their group headings in order", () => {
    renderWithChakra(<SummaryRow summary={{ gauges: [gauge("a", "フロー", 1), gauge("b", "集中", 2), gauge("c", "集中", 3)], tiles: [] }} />);
    expect(screen.getAllByText(/^(フロー|集中)$/).map((e) => e.textContent)).toEqual(["フロー", "集中"]);
  });

  it("hides gauges with neither a value nor history", () => {
    renderWithChakra(<SummaryRow summary={{ gauges: [gauge("measured", "フロー", null, [1, 2]), gauge("unmeasured", "フロー", null)], tiles: [] }} />);
    expect(screen.getByText("measured")).toBeInTheDocument();
    expect(screen.queryByText("unmeasured")).not.toBeInTheDocument();
  });

  it("shows gauges without a group without a heading", () => {
    renderWithChakra(<SummaryRow summary={{ gauges: [gauge("x", undefined, 1)], tiles: [] }} />);
    expect(screen.getByText("x")).toBeInTheDocument();
    expect(screen.queryByText("フロー")).not.toBeInTheDocument();
  });
});
