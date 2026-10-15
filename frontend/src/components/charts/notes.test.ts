import { describe, it, expect } from "vitest";
import { daysToPublish } from "./notes.ts";
import type { NoteEntry } from "../../types/index.ts";

const n = (title: string, status: NoteEntry["status"], created: string, leadTime: number | null = null): NoteEntry => ({
  file: `${title}.org`, title, created, published: null, lead_time_days: leadTime, status, tags: [],
});

describe("daysToPublish", () => {
  it("uses the lead time for published notes and the age for drafts, longest first, without notes that skipped the draft", () => {
    expect(daysToPublish([n("p", "published", "2026-01-01", 10), n("d", "draft", "2026-03-01"), n("m", "published", "2026-01-01")], "2026-03-20")).toEqual([
      { title: "d", days: 19, status: "draft" },
      { title: "p", days: 10, status: "published" },
    ]);
  });
});
