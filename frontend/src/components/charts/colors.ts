export const STATUS_COLORS = {
  TODO: "#f0883e",
  DONE: "#3fb950",
  CLOSE: "#a371f7",
} as const;

export const PALETTE = [
  "#f0883e", "#3fb950", "#a371f7", "#58a6ff", "#f85149",
  "#d2a8ff", "#7ee787", "#ffa657", "#79c0ff", "#ff7b72",
  "#bb8009", "#56d364", "#bc8cff", "#39d353", "#e3b341",
];

export const GRID_STROKE = "#e2e8f0";
export const AXIS_STROKE = "#A0AEC0";
export const TOOLTIP_STYLE = { background: "#fff", border: `1px solid ${GRID_STROKE}` } as const;
export const TOOLTIP_DIV_STYLE = { background: "#fff", border: `1px solid ${GRID_STROKE}`, padding: 8, fontSize: 12 } as const;
export const AGING_THRESHOLD_DAYS = 30;
