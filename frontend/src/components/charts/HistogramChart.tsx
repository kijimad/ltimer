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
    <div className="card">
      <h3>Lead Time Distribution</h3>
      <p className="desc">
        完了タスクのリードタイム分布(ヒストグラム)。中央値や外れ値が一目でわかる
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="range" stroke="#8b949e" label={{ value: "days", position: "insideBottom", offset: -5 }} />
          <YAxis stroke="#8b949e" allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#161b22",
              border: "1px solid #30363d",
            }}
          />
          <Bar
            dataKey="count"
            fill="#58a6ff"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
