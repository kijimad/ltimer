import { describe, it, expect } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { DraftPage } from "./DraftPage.tsx";
import { DRAFTS_DB } from "../test/fixtures.ts";
import { createTestRepository } from "../test/db.ts";
import { renderWithRouter } from "../test/render.tsx";

const repository = { repo: createTestRepository(DRAFTS_DB), error: null };

describe("DraftPage", () => {
  it("renders page title after load", async () => {
    renderWithRouter(<DraftPage />, { repository });
    await waitFor(() => {
      expect(screen.getByText("Draft Lead Time")).toBeInTheDocument();
    });
  });

  it("shows draft and published entries in table", async () => {
    renderWithRouter(<DraftPage />, { repository });
    await waitFor(() => {
      expect(screen.getByText("Draft article")).toBeInTheDocument();
      expect(screen.getByText("Published essay")).toBeInTheDocument();
    });
  });

  it("shows status labels", async () => {
    renderWithRouter(<DraftPage />, { repository });
    await waitFor(() => {
      expect(screen.getByText("draft")).toBeInTheDocument();
      expect(screen.getByText("published")).toBeInTheDocument();
    });
  });

  it("shows lead time for published entries", async () => {
    renderWithRouter(<DraftPage />, { repository });
    await waitFor(() => {
      // サマリのゲージにも同じ値が出るので一覧表に絞る
      expect(within(screen.getByRole("table")).getByText("45")).toBeInTheDocument();
    });
  });

  it("renders summary gauges", async () => {
    renderWithRouter(<DraftPage />, { repository });
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "未公開 Draft" })).toBeInTheDocument();
    });
  });

  it("shows the generated time", async () => {
    renderWithRouter(<DraftPage />, { repository });
    await waitFor(() => {
      expect(screen.getByText(/Generated: .* \(Asia\/Tokyo\)/)).toBeInTheDocument();
    });
  });
});
