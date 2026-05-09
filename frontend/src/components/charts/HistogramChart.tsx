import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Task, TimeUnit } from "../../types/index.ts";
import { periodKey, completedDate } from "../../hooks/usePeriodKey.ts";

const BIN_COLORS = ["#58a6ff", "#3fb950", "#f0883e", "#f85149", "#bc8cff", "#79c0ff", "#d2a8ff", "#56d364"];

interface Props {
  tasks: Task[];
  unit: TimeUnit;
}

export function HistogramChart({ tasks, unit }: Props) {
  const { data, bins } = useMemo(() => {
    // Group completed tasks by period
    const byPeriod: Record<string, number[]> = {};
    for (const t of tasks) {
      if (t.status !== "DONE") continue;
      const cd = completedDate(t);
      if (!cd) continue;
      const pk = periodKey(cd, unit);
      (byPeriod[pk] ??= []).push(t.lead_time_days);
    }

    const periods = Object.keys(byPeriod).sort();
    if (periods.length === 0) return { data: [], bins: [] };

    // Determine bin size from all values
    const allValues = periods.flatMap((p) => byPeriod[p]);
    const max = Math.max(...allValues);
    const binSize = Math.max(1, Math.ceil(max / 6));

    // Collect all bin labels
    const binSet = new Set<number>();
    for (const v of allValues) {
      binSet.add(Math.floor(v / binSize) * binSize);
    }
    const sortedBins = Array.from(binSet).sort((a, b) => a - b);
    const bins = sortedBins.map((b) => `${b}–${b + binSize}d`);

    // X-axis = period, grouped bars = lead time bins
    const data = periods.map((p) => {
      const row: Record<string, string | number> = { period: p };
      for (const bin of sortedBins) {
        const label = `${bin}–${bin + binSize}d`;
        row[label] = byPeriod[p].filter(
          (v) => Math.floor(v / binSize) * binSize === bin,
        ).length;
      }
      return row;
    });

    return { data, bins };
  }, [tasks, unit]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#A0AEC0" />
        <YAxis stroke="#A0AEC0" allowDecimals={false} />
        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0" }} />
        <Legend />
        {bins.map((bin, i) => (
          <Bar
            key={bin}
            dataKey={bin}
            name={bin}
            fill={BIN_COLORS[i % BIN_COLORS.length]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
