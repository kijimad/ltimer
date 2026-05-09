import type { TimeRange } from "../types/index.ts";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "1w", label: "前週" },
  { value: "1m", label: "前月" },
  { value: "3m", label: "3ヶ月" },
  { value: "6m", label: "半年" },
];

export function TimeRangeSwitch({
  range,
  onChange,
}: {
  range: TimeRange;
  onChange: (r: TimeRange) => void;
}) {
  return (
    <div className="controls">
      <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>集計範囲:</span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          className={range === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
