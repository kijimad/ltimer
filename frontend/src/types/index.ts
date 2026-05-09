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
  cutoff_date: string;
  tasks: Task[];
  heatmap: number[][];
  daily_work: DailyWorkEntry[];
}

export interface DraftData {
  generated_at: string;
  entries: DraftEntry[];
}

export type TimeUnit = "week" | "month";
export type TimeRange = "1w" | "1m" | "3m" | "6m";
