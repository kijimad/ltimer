import { describe, it, expect } from "vitest";
import { localDate, addDays, addMonths, daysBetween, asOfDate, formatGeneratedAt } from "./dates.ts";

describe("dates", () => {
  it("formats local date", () => {
    expect(localDate(new Date(2024, 0, 5, 23, 30))).toBe("2024-01-05");
  });

  it("adds days across month boundary", () => {
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("adds months", () => {
    expect(addMonths("2026-10-11", -3)).toBe("2026-07-11");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
  });

  it("clamps to the end of a shorter month", () => {
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2024-03-31", -1)).toBe("2024-02-29");
    expect(addMonths("2026-05-31", -3)).toBe("2026-02-28");
  });

  it("counts days between dates", () => {
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
  });

  // テストは TZ=Asia/Tokyo で実行する (vite.config.ts の test.env)
  it("converts UTC generated_at to the local date", () => {
    expect(asOfDate("2026-10-10T14:59:59Z")).toBe("2026-10-10");
    expect(asOfDate("2026-10-10T15:00:00Z")).toBe("2026-10-11");
  });

  it("formats generated_at in the local time zone", () => {
    expect(formatGeneratedAt("2026-10-11T06:11:04Z")).toBe("2026-10-11 15:11 (Asia/Tokyo)");
  });
});
