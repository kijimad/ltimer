import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimeRangeSwitch } from "./TimeRangeSwitch.tsx";

describe("TimeRangeSwitch", () => {
  it("renders all range buttons", () => {
    render(<TimeRangeSwitch range="3m" onChange={() => {}} />);
    expect(screen.getByText("前週")).toBeInTheDocument();
    expect(screen.getByText("前月")).toBeInTheDocument();
    expect(screen.getByText("3ヶ月")).toBeInTheDocument();
    expect(screen.getByText("半年")).toBeInTheDocument();
  });

  it("marks current range as active", () => {
    render(<TimeRangeSwitch range="1m" onChange={() => {}} />);
    expect(screen.getByText("前月")).toHaveClass("active");
    expect(screen.getByText("3ヶ月")).not.toHaveClass("active");
  });

  it("calls onChange when clicking a button", async () => {
    const onChange = vi.fn();
    render(<TimeRangeSwitch range="3m" onChange={onChange} />);
    await userEvent.click(screen.getByText("半年"));
    expect(onChange).toHaveBeenCalledWith("6m");
  });
});
