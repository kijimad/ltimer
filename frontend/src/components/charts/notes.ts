import type { NoteEntry } from "../../types/index.ts";
import { daysBetween } from "../../dates.ts";

export interface DaysToPublish {
  title: string;
  days: number;
  status: "draft" | "published";
}

export function daysToPublish(notes: NoteEntry[], asOf: string): DaysToPublish[] {
  return notes
    .flatMap((n): DaysToPublish[] => {
      if (n.status === "published" && n.lead_time_days !== null) return [{ title: n.title, days: n.lead_time_days, status: "published" }];
      if (n.status === "draft") return [{ title: n.title, days: daysBetween(n.created, asOf), status: "draft" }];
      return [];
    })
    .sort((a, b) => b.days - a.days);
}
