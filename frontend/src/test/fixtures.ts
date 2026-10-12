import type { Task, DraftEntry } from "../types/index.ts";
import type { TestData } from "./db.ts";

export const TASKS: Task[] = [
  {
    title: "Implement auth",
    file: "20240101T120000--project__web.org",
    status: "DONE",
    first_clock_in: "2024-01-10 09:00",
    last_clock_out: "2024-01-20 17:00",
    closed_at: "2024-01-20 17:00",
    lead_time_days: 10,
    total_minutes: 300,
    clock_count: 2,
    clocks: [
      { start: "2024-01-10 09:00", end: "2024-01-10 10:00", minutes: 60 },
      { start: "2024-01-20 13:00", end: "2024-01-20 17:00", minutes: 240 },
    ],
  },
  {
    title: "Fix bug #42",
    file: "20240101T120000--project__web.org",
    status: "TODO",
    first_clock_in: "2024-02-01 10:00",
    last_clock_out: "2024-03-15 12:00",
    closed_at: null,
    lead_time_days: 43,
    total_minutes: 120,
    clock_count: 2,
    clocks: [
      { start: "2024-02-01 10:00", end: "2024-02-01 11:00", minutes: 60 },
      { start: "2024-03-15 11:00", end: "2024-03-15 12:00", minutes: 60 },
    ],
  },
  {
    title: "Write docs",
    file: "20240201T090000--docs__ref.org",
    status: "CLOSE",
    first_clock_in: "2024-01-15 08:00",
    last_clock_out: "2024-01-16 10:00",
    closed_at: "2024-01-16 10:00",
    lead_time_days: 1,
    total_minutes: 60,
    clock_count: 2,
    clocks: [
      { start: "2024-01-15 08:00", end: "2024-01-15 08:30", minutes: 30 },
      { start: "2024-01-16 09:30", end: "2024-01-16 10:00", minutes: 30 },
    ],
  },
  {
    title: "Refactor DB",
    file: "20240201T090000--docs__ref.org",
    status: "DONE",
    first_clock_in: "2024-01-05 09:00",
    last_clock_out: "2024-01-05 12:00",
    closed_at: "2024-01-05 12:00",
    lead_time_days: 0,
    total_minutes: 180,
    clock_count: 1,
    clocks: [{ start: "2024-01-05 09:00", end: "2024-01-05 12:00", minutes: 180 }],
  },
];

export const TASKS_DB: TestData = {
  generatedAt: "2024-03-01T03:00:00Z",
  tasks: [
    {
      title: "Implement auth",
      file: "20240101T120000--project__web.org",
      status: "DONE",
      closed_at: "2024-02-20T08:00:00Z",
      effort_minutes: null,
      deadline: null,
      clocks: [
        { start: "2024-02-10T00:00:00Z", end: "2024-02-10T01:00:00Z", minutes: 60 },
        { start: "2024-02-20T07:00:00Z", end: "2024-02-20T08:00:00Z", minutes: 60 },
      ],
    },
    {
      title: "Fix bug #42",
      file: "20240101T120000--project__web.org",
      status: "TODO",
      closed_at: null,
      effort_minutes: null,
      deadline: null,
      clocks: [{ start: "2024-02-25T01:00:00Z", end: "2024-02-25T02:00:00Z", minutes: 60 }],
    },
  ],
};

export const DRAFT_ENTRIES: DraftEntry[] = [
  {
    file: "20260301T120000--article__draft_essay.org",
    title: "Draft article",
    created: "2026-03-01",
    published: null,
    lead_time_days: null,
    status: "draft",
  },
  {
    file: "20260201T100000--published__essay.org",
    title: "Published essay",
    created: "2026-02-01",
    published: "2026-03-17",
    lead_time_days: 45,
    status: "published",
  },
];

export const DRAFTS_DB: TestData = {
  generatedAt: "2026-03-20T03:00:00Z",
  drafts: DRAFT_ENTRIES,
};
