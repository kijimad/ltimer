import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeRangeSwitch } from "./TimeRangeSwitch.tsx";
import { renderWithChakra } from "../test/render.tsx";

describe("TimeRangeSwitch", () => {
  it("renders all range buttons", () => {
    renderWithChakra(<TimeRangeSwitch range="3m" onChange={() => {}} />);
    expect(screen.getByText("前週")).toBeInTheDocument();
    expect(screen.getByText("前月")).toBeInTheDocument();
    expect(screen.getByText("3ヶ月")).toBeInTheDocument();
    expect(screen.getByText("半年")).toBeInTheDocument();
  });

  it("highlights the active range button", () => {
    renderWithChakra(<TimeRangeSwitch range="1m" onChange={() => {}} />);
    // Active button uses variant="solid", inactive uses variant="outline"
    expect(screen.getByText("前月").closest("button")).toBeInTheDocument();
  });

  it("shows the selected date range", () => {
    renderWithChakra(
      <TimeRangeSwitch range="3m" onChange={() => {}} startedAt="2026-07-10" finishedAt="2026-10-11" />
    );
    expect(screen.getByText("2026-07-10 ~ 2026-10-11")).toBeInTheDocument();
  });

  it("calls onChange when clicking a button", async () => {
    const onChange = vi.fn();
    renderWithChakra(<TimeRangeSwitch range="3m" onChange={onChange} />);
    await userEvent.click(screen.getByText("半年"));
    expect(onChange).toHaveBeenCalledWith("6m");
  });
});
