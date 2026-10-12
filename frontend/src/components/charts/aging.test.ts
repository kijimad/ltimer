import { describe, it, expect } from "vitest";
import { agingBars } from "./aging.ts";

describe("agingBars", () => {
  const pace = { p50: 2, p70: 5, p85: 10, p95: 20 };

  it("colors each TODO by the pace band of its age", () => {
    const bars = agingBars([{ title: "a", days: 2 }, { title: "b", days: 11 }, { title: "c", days: 21 }], pace);
    expect(bars.map((b) => [b.band, b.fill])).toEqual([
      ["p50 以内", "#3fb950"],
      ["p95 以内", "#f85149"],
      ["p95 超", "#a40e26"],
    ]);
  });

  it("falls back to the fixed threshold without a pace", () => {
    const bars = agingBars([{ title: "a", days: 30 }, { title: "b", days: 31 }], null);
    expect(bars.map((b) => [b.band, b.fill])).toEqual([
      [null, "#f0883e"],
      [null, "#f85149"],
    ]);
  });

  it("shortens long titles for the axis", () => {
    expect(agingBars([{ title: "あ".repeat(30), days: 1 }], null)[0].title).toHaveLength(25);
  });
});
