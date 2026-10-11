import { describe, it, expect } from "vitest";
import { Gauge } from "./Gauge.tsx";
import { renderWithChakra } from "../test/render.tsx";
import type { GaugeMetric } from "../metrics.ts";

const HISTORY = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

function metric(overrides: Partial<GaugeMetric>): GaugeMetric {
  return { key: "k", label: "指標", desc: "", unit: "", value: 5, history: HISTORY, higherIsBetter: true, ...overrides };
}

function axisLabels(container: HTMLElement) {
  return [...container.querySelectorAll("svg text")].map((t) => t.textContent);
}

/** 半円の左端 (x=20) から右端 (x=180) のどちらに針先があるか */
function needleX(container: HTMLElement): number {
  return Number(container.querySelector("svg line")!.getAttribute("x2"));
}

describe("Gauge", () => {
  it("puts larger values on the right when higher is better", () => {
    const { container } = renderWithChakra(<Gauge metric={metric({ value: 9 })} />);
    expect(axisLabels(container)).toEqual(["1", "9"]);
    expect(needleX(container)).toBeGreaterThan(100);
  });

  it("flips the scale so that the good side is on the right when lower is better", () => {
    const { container } = renderWithChakra(<Gauge metric={metric({ value: 2, higherIsBetter: false })} />);
    expect(axisLabels(container)).toEqual(["9", "1"]);
    // 小さい値 (良い) は右に振れる
    expect(needleX(container)).toBeGreaterThan(100);
  });

  it("always draws the bad band on the left and the good band on the right", () => {
    for (const higherIsBetter of [true, false]) {
      const { container, unmount } = renderWithChakra(<Gauge metric={metric({ higherIsBetter })} />);
      const strokes = [...container.querySelectorAll("svg path")].map((p) => p.getAttribute("stroke"));
      expect(strokes).toEqual(["#f85149", "#e3b341", "#3fb950"]);
      unmount();
    }
  });
});
