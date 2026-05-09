import type { TimeUnit } from "../types/index.ts";

export function periodKey(dateStr: string, unit: TimeUnit): string {
  const d = new Date(dateStr);
  if (unit === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  // week: ISO week Monday
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
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
