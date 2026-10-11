import type { TimeUnit } from "../types/index.ts";
import { addDays } from "../dates.ts";

/** Date の文字列解釈と toISOString はタイムゾーンで日付がずれるので、先頭10文字を暦日として扱う */
export function periodKey(dateStr: string, unit: TimeUnit): string {
  const date = dateStr.slice(0, 10);
  if (unit === "month") return date.slice(0, 7);
  // week: ISO week Monday
  const day = new Date(`${date}T00:00:00`).getDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

export function completedDate(
  t: { status: string; closed_at: string | null; last_clock_out: string }
): string | null {
  if (t.status === "TODO") return null;
  return t.closed_at ? t.closed_at.slice(0, 10) : t.last_clock_out.slice(0, 10);
}

export function shortName(filename: string): string {
  return filename
    .replace(/^\d{8}T?\d{0,6}--/, "")
    .replace(/\.org$/, "")
    .replace(/__/g, " ");
}
