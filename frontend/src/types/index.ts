export interface Task {
  title: string;
  file: string;
  status: "TODO" | "DONE" | "CLOSE";
  first_clock_in: string;
  last_clock_out: string;
  closed_at: string | null;
  lead_time_days: number;
  total_minutes: number;
  clock_count: number;
}

export interface DailyWorkEntry {
  date: string;
  tasks: { title: string; minutes: number }[];
}

export interface DraftEntry {
  file: string;
  title: string;
  created: string;
  published: string | null;
  lead_time_days: number | null;
  status: "draft" | "published";
}

export interface WorkflowData {
  generated_at: string;
  tasks: Task[];
  daily_work: DailyWorkEntry[];
}

export interface DraftData {
  generated_at: string;
  entries: DraftEntry[];
}

export interface ActivityDailyEntry {
  date: string;
  activities: { title: string; minutes: number }[];
}

export interface ActivityData {
  generated_at: string;
  daily: ActivityDailyEntry[];
}

// JSON の形式。時点は UTC

export interface RawClock {
  start: string;
  end: string;
  minutes: number;
}

export interface RawTask {
  title: string;
  file: string;
  status: Task["status"];
  closed_at: string | null;
  clocks: RawClock[];
}

export interface RawWorkflowData {
  generated_at: string;
  tasks: RawTask[];
}

export interface RawActivityData {
  generated_at: string;
  activities: { title: string; clocks: RawClock[] }[];
}

export type TimeUnit = "week" | "month";
export type TimeRange = "1w" | "1m" | "3m" | "6m";
