import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { GeneratedAt } from "./GeneratedAt.tsx";
import { renderWithChakra } from "../test/render.tsx";

const GENERATED = "2026-10-11T06:00:00Z";
const hoursLater = (h: number) => Date.parse(GENERATED) + h * 3600000;

describe("GeneratedAt", () => {
  it("shows the age of the data", () => {
    renderWithChakra(<GeneratedAt generatedAt={GENERATED} now={hoursLater(3.5)} />);
    expect(screen.getByText(/Generated: 2026-10-11 15:00 \(Asia\/Tokyo\) \(3時間前\)/)).toBeInTheDocument();
    expect(screen.queryByText(/データが更新されていない/)).not.toBeInTheDocument();
  });

  it("warns when the data is older than 24 hours", () => {
    renderWithChakra(<GeneratedAt generatedAt={GENERATED} now={hoursLater(25)} />);
    expect(screen.getByText(/25時間前.*データが更新されていない/)).toBeInTheDocument();
  });

  it("does not warn at exactly 24 hours", () => {
    renderWithChakra(<GeneratedAt generatedAt={GENERATED} now={hoursLater(24)} />);
    expect(screen.queryByText(/データが更新されていない/)).not.toBeInTheDocument();
  });
});
