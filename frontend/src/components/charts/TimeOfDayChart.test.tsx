import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { RhythmTooltip } from "./TimeOfDayChart.tsx";
import { renderWithChakra } from "../../test/render.tsx";

describe("RhythmTooltip", () => {
  it("lists the values of every weekday at the hour", () => {
    renderWithChakra(<RhythmTooltip point={{ hour: 22, 月: 50, 火: 0, 水: 6.3, 木: 30, 金: 0, 土: 12, 日: 40 }} />);
    expect(screen.getByText("22時台 (分/日)")).toBeInTheDocument();
    const rows = ["月", "火", "水", "木", "金", "土", "日"].map((d) => screen.getByText(d).parentElement!.textContent);
    expect(rows).toEqual(["月50", "火0", "水6.3", "木30", "金0", "土12", "日40"]);
  });
});
