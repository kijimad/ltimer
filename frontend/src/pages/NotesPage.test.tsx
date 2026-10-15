import { describe, it, expect } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotesPage } from "./NotesPage.tsx";
import { NOTES_DB, NOTE_ROWS } from "../test/fixtures.ts";
import { createTestRepository } from "../test/db.ts";
import { renderWithRouter } from "../test/render.tsx";

const repository = { repo: createTestRepository(NOTES_DB), error: null };

describe("NotesPage", () => {
  it("lists notes of every status with their tags", async () => {
    renderWithRouter(<NotesPage />, { repository });
    const table = await waitFor(() => screen.getByRole("table"));
    expect(within(table).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell").slice(0, 3).map((c) => c.textContent))).toEqual([
      ["Permanent memo", "permanent", "published"],
      ["Draft article", "essay", "draft"],
      ["Published essay", "essay", "published"],
    ]);
  });

  it("sorts by a column with empty values last in both directions", async () => {
    const quick = { ...NOTE_ROWS[1], file: "20260305T000000--quick__essay.org", title: "Quick essay", created: "2026-03-05", published: "2026-03-07", lead_time_days: 2 };
    const repo = createTestRepository({ ...NOTES_DB, notes: [...NOTE_ROWS, quick] });
    renderWithRouter(<NotesPage />, { repository: { repo, error: null } });
    const table = await waitFor(() => screen.getByRole("table"));
    const titles = () => within(table).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);
    await userEvent.click(within(table).getByText("Lead Time (d)"));
    expect(titles()).toEqual(["Published essay", "Quick essay", "Permanent memo", "Draft article"]);
    await userEvent.click(within(table).getByText("Lead Time (d)"));
    expect(titles()).toEqual(["Quick essay", "Published essay", "Permanent memo", "Draft article"]);
  });

  it("sorts by tags with untagged notes last", async () => {
    const untagged = { ...NOTE_ROWS[2], file: "20260311T000000--untagged.org", title: "Untagged memo", created: "2026-03-11", published: "2026-03-11", tags: [] };
    const repo = createTestRepository({ ...NOTES_DB, notes: [...NOTE_ROWS, untagged] });
    renderWithRouter(<NotesPage />, { repository: { repo, error: null } });
    const table = await waitFor(() => screen.getByRole("table"));
    await userEvent.click(within(table).getByText("Tags"));
    expect(within(table).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[1].textContent)).toEqual(["permanent", "essay", "essay", ""]);
  });

  it("shows the generated time", async () => {
    renderWithRouter(<NotesPage />, { repository });
    await waitFor(() => {
      expect(screen.getByText(/Generated: .* \(Asia\/Tokyo\)/)).toBeInTheDocument();
    });
  });

  it("renders summary gauges", async () => {
    renderWithRouter(<NotesPage />, { repository });
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "作成数" })).toBeInTheDocument();
    });
  });
});
