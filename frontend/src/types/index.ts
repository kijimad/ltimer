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
  started_at?: string;
  tasks: Task[];
  heatmap: number[][];
  daily_work: DailyWorkEntry[];
}

export interface DraftData {
  generated_at: string;
  entries: DraftEntry[];
}

export interface Activity {
  title: string;
  total_minutes: number;
  session_count: number;
  active_days: number;
  first_date: string;
  last_date: string;
}

export interface ActivityDailyEntry {
  date: string;
  activities: { title: string; minutes: number }[];
}

export interface ActivityData {
  generated_at: string;
  activities: Activity[];
  daily: ActivityDailyEntry[];
}

export type TimeUnit = "week" | "month";
export type TimeRange = "1w" | "1m" | "3m" | "6m";
