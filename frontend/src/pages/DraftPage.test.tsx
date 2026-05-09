import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DraftPage } from "./DraftPage.tsx";
import { DRAFT_DATA } from "../test/fixtures.ts";

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    json: () => Promise.resolve(DRAFT_DATA),
  } as Response);
});

describe("DraftPage", () => {
  it("renders page title after load", async () => {
    render(
      <MemoryRouter>
        <DraftPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("Draft Lead Time")).toBeInTheDocument();
    });
  });

  it("shows draft and published entries in table", async () => {
    render(
      <MemoryRouter>
        <DraftPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("Draft article")).toBeInTheDocument();
      expect(screen.getByText("Published essay")).toBeInTheDocument();
    });
  });

  it("shows status labels", async () => {
    render(
      <MemoryRouter>
        <DraftPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("draft")).toBeInTheDocument();
      expect(screen.getByText("published")).toBeInTheDocument();
    });
  });

  it("shows lead time for published entries", async () => {
    render(
      <MemoryRouter>
        <DraftPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("45")).toBeInTheDocument();
    });
  });
});
