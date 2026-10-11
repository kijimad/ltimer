import { describe, it, expect } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TasksPage } from "./TasksPage.tsx";
import { TASKS_DB } from "../test/fixtures.ts";
import { createTestRepository } from "../test/db.ts";
import { renderWithRouter } from "../test/render.tsx";

const repository = { repo: createTestRepository(TASKS_DB), error: null };

describe("TasksPage", () => {
  it("renders dashboard title after data loads", async () => {
    renderWithRouter(<TasksPage />, { repository });
    await waitFor(() => {
      expect(screen.getByText("Lead Time Dashboard")).toBeInTheDocument();
    });
  });

  it("shows generated date", async () => {
    renderWithRouter(<TasksPage />, { repository });
    await waitFor(() => {
      expect(screen.getByText(/Generated: 2024-03-01/)).toBeInTheDocument();
    });
  });

  it("warns that the data is stale against the viewing time", async () => {
    renderWithRouter(<TasksPage />, { repository });
    // フィクスチャは 2024-03-01 生成なので、閲覧時点からは必ず 24時間を超えている
    await waitFor(() => {
      expect(screen.getByText(/データが更新されていない/)).toBeInTheDocument();
    });
  });

  it("ends the range at the generated date, not the viewing date", async () => {
    renderWithRouter(<TasksPage />, { repository });
    await waitFor(() => {
      expect(screen.getByText("2024-02-01 ~ 2024-03-01")).toBeInTheDocument();
    });
  });

  it("renders time range switch", async () => {
    renderWithRouter(<TasksPage />, { repository });
    await waitFor(() => {
      expect(screen.getByText("3ヶ月")).toBeInTheDocument();
      expect(screen.getByText("半年")).toBeInTheDocument();
    });
  });

  it("shows loading state until the data is ready", () => {
    renderWithRouter(<TasksPage />, { repository: { repo: null, error: null } });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error when the data fails to load", async () => {
    renderWithRouter(<TasksPage />, { repository: { repo: null, error: "Network error" } });
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it("renders summary gauges", async () => {
    renderWithRouter(<TasksPage />, { repository });
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "スループット" })).toBeInTheDocument();
    });
  });

  it("recomputes the summary for the selected range", async () => {
    renderWithRouter(<TasksPage />, { repository });
    const throughput = () => within(screen.getByRole("img", { name: "スループット" }).parentElement!);
    const value = (n: string) => (_: string, el: Element | null) => el?.textContent === `${n}件`;
    // 02-20 に完了した DONE が 1件。1m (02-01〜03-01) には入り 1w (02-23〜03-01) には入らない
    await waitFor(() => expect(throughput().getByText(value("1"))).toBeInTheDocument());
    await userEvent.click(screen.getByText("前週"));
    expect(throughput().getByText(value("0"))).toBeInTheDocument();
  });
});
