import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { DraftPage } from "./DraftPage.tsx";
import { DRAFT_DATA } from "../test/fixtures.ts";
import { renderWithRouter } from "../test/render.tsx";

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    json: () => Promise.resolve(DRAFT_DATA),
  } as Response);
});

describe("DraftPage", () => {
  it("renders page title after load", async () => {
    renderWithRouter(<DraftPage />);
    await waitFor(() => {
      expect(screen.getByText("Draft Lead Time")).toBeInTheDocument();
    });
  });

  it("shows draft and published entries in table", async () => {
    renderWithRouter(<DraftPage />);
    await waitFor(() => {
      expect(screen.getByText("Draft article")).toBeInTheDocument();
      expect(screen.getByText("Published essay")).toBeInTheDocument();
    });
  });

  it("shows status labels", async () => {
    renderWithRouter(<DraftPage />);
    await waitFor(() => {
      expect(screen.getByText("draft")).toBeInTheDocument();
      expect(screen.getByText("published")).toBeInTheDocument();
    });
  });

  it("shows lead time for published entries", async () => {
    renderWithRouter(<DraftPage />);
    await waitFor(() => {
      expect(screen.getByText("45")).toBeInTheDocument();
    });
  });
});
