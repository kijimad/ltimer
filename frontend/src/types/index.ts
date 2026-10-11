export interface TaskClock {
  start: string;
  end: string;
  minutes: number;
}

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
  /** 開始時刻の昇順 */
  clocks: TaskClock[];
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

export interface ActivityDailyEntry {
  date: string;
  activities: { title: string; minutes: number }[];
}

export type TimeUnit = "week" | "month";
export type TimeRange = "1w" | "1m" | "3m" | "6m";
