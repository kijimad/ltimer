import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { useTimeRange } from "./useTimeRange.ts";

function Consumer() {
  useTimeRange();
  return null;
}

describe("useTimeRange", () => {
  it("throws outside TimeRangeProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow("useTimeRange must be used within TimeRangeProvider");
  });
});
