import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { Layout } from "./Layout.tsx";
import { renderWithRouter } from "../test/render.tsx";

describe("Layout", () => {
  it("renders navigation links", () => {
    renderWithRouter(<Layout />);
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders Tasks link on /", () => {
    renderWithRouter(<Layout />, { route: "/" });
    expect(screen.getByText("Tasks")).toBeInTheDocument();
  });
});
