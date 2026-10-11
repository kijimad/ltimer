import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { ActivityPage } from "./ActivityPage.tsx";
import { renderWithRouter } from "../test/render.tsx";
import type { RawActivityData } from "../types/index.ts";

const RAW_ACTIVITY_DATA: RawActivityData = {
  generated_at: "2024-03-01T03:00:00Z",
  activities: [
    { title: "英語を読む", clocks: [{ start: "2024-02-29T23:00:00Z", end: "2024-02-29T23:30:00Z", minutes: 30 }] },
  ],
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    json: () => Promise.resolve(RAW_ACTIVITY_DATA),
  } as Response);
});

describe("ActivityPage", () => {
  it("renders summary gauges after data loads", async () => {
    renderWithRouter(<ActivityPage />);
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "投下時間" })).toBeInTheDocument();
    });
  });

  it("buckets activity into the local date and shows it in streaks", async () => {
    renderWithRouter(<ActivityPage />);
    // UTC 02-29 23:00 は JST 03-01 08:00。基準日 03-01 当日の実施になり現在のストリークが 1d
    await waitFor(() => {
      expect(screen.getAllByText("1d").length).toBeGreaterThan(0);
    });
  });

  it("shows error on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    renderWithRouter(<ActivityPage />);
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it("shows the generated time", async () => {
    renderWithRouter(<ActivityPage />);
    await waitFor(() => {
      expect(screen.getByText(/Generated: .* \(Asia\/Tokyo\)/)).toBeInTheDocument();
    });
  });
});
