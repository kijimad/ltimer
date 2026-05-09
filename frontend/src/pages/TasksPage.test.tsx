import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TasksPage } from "./TasksPage.tsx";
import { WORKFLOW_DATA } from "../test/fixtures.ts";

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    json: () => Promise.resolve(WORKFLOW_DATA),
  } as Response);
});

describe("TasksPage", () => {
  it("renders dashboard title after data loads", async () => {
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("Lead Time Dashboard")).toBeInTheDocument();
    });
  });

  it("shows generated date", async () => {
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/2024-03-01/)).toBeInTheDocument();
    });
  });

  it("renders time range switch", async () => {
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("3ヶ月")).toBeInTheDocument();
      expect(screen.getByText("半年")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });
});
