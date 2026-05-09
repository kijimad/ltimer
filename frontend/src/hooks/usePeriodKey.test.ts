import { describe, it, expect } from "vitest";
import { periodKey, completedDate, shortName } from "./usePeriodKey.ts";

describe("periodKey", () => {
  it("returns ISO Monday for week unit", () => {
    // 2024-01-10 is Wednesday
    expect(periodKey("2024-01-10", "week")).toBe("2024-01-08");
  });

  it("returns Monday for Sunday", () => {
    // 2024-01-14 is Sunday
    expect(periodKey("2024-01-14", "week")).toBe("2024-01-08");
  });

  it("returns Monday for Monday", () => {
    // 2024-01-08 is Monday
    expect(periodKey("2024-01-08", "week")).toBe("2024-01-08");
  });

  it("returns YYYY-MM for month unit", () => {
    expect(periodKey("2024-01-15", "month")).toBe("2024-01");
    expect(periodKey("2024-12-01", "month")).toBe("2024-12");
  });
});

describe("completedDate", () => {
  it("returns null for TODO", () => {
    expect(completedDate({ status: "TODO", closed_at: null, last_clock_out: "2024-01-10 12:00" })).toBeNull();
  });

  it("returns closed_at date for DONE with closed_at", () => {
    expect(
      completedDate({ status: "DONE", closed_at: "2024-01-20 17:00", last_clock_out: "2024-01-19 12:00" })
    ).toBe("2024-01-20");
  });

  it("returns last_clock_out date when no closed_at", () => {
    expect(
      completedDate({ status: "DONE", closed_at: null, last_clock_out: "2024-01-19 12:00" })
    ).toBe("2024-01-19");
  });

  it("returns date for CLOSE status", () => {
    expect(
      completedDate({ status: "CLOSE", closed_at: "2024-02-01 10:00", last_clock_out: "2024-01-30 12:00" })
    ).toBe("2024-02-01");
  });
});

describe("shortName", () => {
  it("strips new-format timestamp prefix and .org suffix", () => {
    expect(shortName("20260127T093439--kdoc-538.org")).toBe("kdoc-538");
  });

  it("does not strip old-format timestamp with single dash", () => {
    // Old org-roam format uses single dash, not matched by regex
    expect(shortName("20210508233810-org_roam.org")).toBe("20210508233810-org_roam");
  });

  it("replaces __ with single space", () => {
    expect(shortName("20240101T120000--project__web.org")).toBe("project web");
  });
});
