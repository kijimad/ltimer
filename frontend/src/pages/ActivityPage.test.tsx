import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { ActivityPage } from "./ActivityPage.tsx";
import { renderWithRouter } from "../test/render.tsx";
import { createTestDatabase } from "../test/db.ts";

const ACTIVITY_DATA = {
  generatedAt: "2024-03-01T03:00:00Z",
  activities: [
    { title: "英語を読む", clocks: [{ start: "2024-02-29T23:00:00Z", end: "2024-02-29T23:30:00Z", minutes: 30 }] },
  ],
};

const database = { db: createTestDatabase(ACTIVITY_DATA), error: null };

describe("ActivityPage", () => {
  it("renders summary gauges after data loads", async () => {
    renderWithRouter(<ActivityPage />, { database });
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "投下時間" })).toBeInTheDocument();
    });
  });

  it("buckets activity into the local date and shows it in streaks", async () => {
    renderWithRouter(<ActivityPage />, { database });
    // UTC 02-29 23:00 は JST 03-01 08:00。基準日 03-01 当日の実施になり現在のストリークが 1d
    await waitFor(() => {
      expect(screen.getAllByText("1d").length).toBeGreaterThan(0);
    });
  });

  it("shows error when the database fails to load", async () => {
    renderWithRouter(<ActivityPage />, { database: { db: null, error: "Network error" } });
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it("shows the generated time", async () => {
    renderWithRouter(<ActivityPage />, { database });
    await waitFor(() => {
      expect(screen.getByText(/Generated: .* \(Asia\/Tokyo\)/)).toBeInTheDocument();
    });
  });
});
