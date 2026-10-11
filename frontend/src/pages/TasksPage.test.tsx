import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TasksPage } from "./TasksPage.tsx";
import { RAW_WORKFLOW_DATA } from "../test/fixtures.ts";
import { renderWithRouter } from "../test/render.tsx";

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    json: () => Promise.resolve(RAW_WORKFLOW_DATA),
  } as Response);
});

describe("TasksPage", () => {
  it("renders dashboard title after data loads", async () => {
    renderWithRouter(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByText("Lead Time Dashboard")).toBeInTheDocument();
    });
  });

  it("shows generated date", async () => {
    renderWithRouter(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByText(/Generated: 2024-03-01/)).toBeInTheDocument();
    });
  });

  it("warns that the data is stale against the viewing time", async () => {
    renderWithRouter(<TasksPage />);
    // フィクスチャは 2024-03-01 生成なので、閲覧時点からは必ず 24時間を超えている
    await waitFor(() => {
      expect(screen.getByText(/データが更新されていない/)).toBeInTheDocument();
    });
  });

  it("ends the range at the generated date, not the viewing date", async () => {
    renderWithRouter(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByText("2024-02-01 ~ 2024-03-01")).toBeInTheDocument();
    });
  });

  it("renders time range switch", async () => {
    renderWithRouter(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByText("3ヶ月")).toBeInTheDocument();
      expect(screen.getByText("半年")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    renderWithRouter(<TasksPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    renderWithRouter(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it("renders summary gauges", async () => {
    renderWithRouter(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByRole("img", { name: "スループット" })).toBeInTheDocument();
    });
  });

  it("recomputes the summary for the selected range", async () => {
    renderWithRouter(<TasksPage />);
    const throughput = () => within(screen.getByRole("img", { name: "スループット" }).parentElement!);
    const value = (n: string) => (_: string, el: Element | null) => el?.textContent === `${n}件`;
    // 02-20 に完了した DONE が 1件。1m (02-01〜03-01) には入り 1w (02-23〜03-01) には入らない
    await waitFor(() => expect(throughput().getByText(value("1"))).toBeInTheDocument());
    await userEvent.click(screen.getByText("前週"));
    expect(throughput().getByText(value("0"))).toBeInTheDocument();
  });
});
