import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { SummaryRow } from "./SummaryRow.tsx";
import { renderWithChakra } from "../test/render.tsx";

const tile = (alert: boolean) => ({ key: "k", label: "最後の DONE から", desc: "", value: 5, unit: "日", alert });

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
});
