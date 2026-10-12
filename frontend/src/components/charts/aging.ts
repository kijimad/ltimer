import type { LeadTimePace } from "../../data/repository.ts";
import { PACE_BANDS, paceBand } from "../../metrics.ts";
import { AGING_THRESHOLD_DAYS } from "./colors.ts";

export const PACE_COLORS = ["#3fb950", "#d29922", "#f0883e", "#f85149", "#a40e26"];

/** 過去の DONE が少ないうちは、決め打ちの日数で警告する */
export function agingBars(todos: { title: string; days: number }[], pace: LeadTimePace | null) {
  return todos.map(({ title, days }) => {
    const band = pace ? paceBand(days, pace) : null;
    return {
      title: title.slice(0, 25),
      days,
      band: band === null ? null : PACE_BANDS[band],
      fill: band === null ? (days > AGING_THRESHOLD_DAYS ? "#f85149" : "#f0883e") : PACE_COLORS[band],
    };
  });
}

