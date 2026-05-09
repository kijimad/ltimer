import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlertList } from "./AlertList.tsx";
import { TASKS } from "../../test/fixtures.ts";

describe("AlertList", () => {
  it("shows TODO tasks with lead_time > 30 days", () => {
    render(<AlertList tasks={TASKS} />);
    // Fix bug #42 is TODO with 43 days
    expect(screen.getByText("43d")).toBeInTheDocument();
    expect(screen.getByText("Fix bug #42")).toBeInTheDocument();
  });

  it("does not show DONE/CLOSE tasks even if lead_time > 30", () => {
    render(<AlertList tasks={TASKS} />);
    expect(screen.queryByText("Implement auth")).not.toBeInTheDocument();
    expect(screen.queryByText("Write docs")).not.toBeInTheDocument();
  });

  it("shows no alerts message when none qualify", () => {
    const tasks = TASKS.filter((t) => t.status !== "TODO");
    render(<AlertList tasks={tasks} />);
    expect(screen.getByText("No alerts")).toBeInTheDocument();
  });
});
