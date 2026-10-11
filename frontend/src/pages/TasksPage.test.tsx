import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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

  it("ends the range at the generated date, not the viewing date", async () => {
    renderWithRouter(<TasksPage />);
    await waitFor(() => {
      expect(screen.getByText("2023-12-01 ~ 2024-03-01")).toBeInTheDocument();
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
});
