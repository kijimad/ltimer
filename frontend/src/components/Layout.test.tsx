import { describe, it, expect } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./Layout.tsx";
import { NavTimeRangeSwitch } from "./TimeRangeSwitch.tsx";
import { FooterGeneratedAt } from "./GeneratedAt.tsx";
import { useTimeRange } from "../hooks/useTimeRange.ts";
import { renderWithRouter } from "../test/render.tsx";

function RangePage({ name }: { name: string }) {
  const { range } = useTimeRange();
  return (
    <>
      <p>{name}: {range}</p>
      <NavTimeRangeSwitch startedAt="2026-09-11" finishedAt="2026-10-11" />
      <FooterGeneratedAt generatedAt="2026-10-11T06:00:00Z" now={Date.parse("2026-10-11T07:00:00Z")} />
    </>
  );
}

function renderApp(route = "/") {
  return renderWithRouter(
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<RangePage name="tasks" />} />
        <Route path="draft" element={<RangePage name="draft" />} />
        <Route path="help" element={<p>help</p>} />
      </Route>
    </Routes>,
    { route },
  );
}

describe("Layout", () => {
  it("renders navigation links", () => {
    renderApp();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders the time range switch inside the navigation bar", () => {
    renderApp();
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByText("前月")).toBeInTheDocument();
    expect(within(nav).getByText("2026-09-11 ~ 2026-10-11")).toBeInTheDocument();
  });

  it("keeps the selected range across pages", async () => {
    renderApp();
    expect(screen.getByText("tasks: 1m")).toBeInTheDocument();
    await userEvent.click(screen.getByText("半年"));
    await userEvent.click(screen.getByText("Draft"));
    expect(screen.getByText("draft: 6m")).toBeInTheDocument();
  });

  it("hides the switch on pages without a time range", () => {
    renderApp("/help");
    expect(screen.queryByText("前月")).not.toBeInTheDocument();
  });

  it("renders the generated time inside the footer", () => {
    renderApp();
    expect(within(screen.getByRole("contentinfo")).getByText(/Generated: 2026-10-11 15:00/)).toBeInTheDocument();
  });

  it("leaves the footer empty on pages without data", () => {
    renderApp("/help");
    expect(screen.getByRole("contentinfo")).toBeEmptyDOMElement();
  });
});
