import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Task } from "../../types/index.ts";

interface Props {
  tasks: Task[];
}

export function HistogramChart({ tasks }: Props) {
  const data = useMemo(() => {
    const done = tasks
      .filter((t) => t.status === "DONE")
      .map((t) => t.lead_time_days);
    if (done.length === 0) return [];

    const max = Math.max(...done);
    const binSize = Math.max(1, Math.ceil(max / 15));
    const bins: Record<number, number> = {};
    for (const d of done) {
      const bin = Math.floor(d / binSize) * binSize;
      bins[bin] = (bins[bin] || 0) + 1;
    }
    return Object.entries(bins)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([bin, count]) => ({
        range: `${bin}-${Number(bin) + binSize}`,
        count,
      }));
  }, [tasks]);

  return (
    <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="range" stroke="#A0AEC0" label={{ value: "days", position: "insideBottom", offset: -5 }} />
          <YAxis stroke="#A0AEC0" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
            }}
          />
          <Bar
            dataKey="count"
            fill="#58a6ff"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
  );
}
