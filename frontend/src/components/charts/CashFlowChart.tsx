import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Task, TimeUnit } from "../../types/index.ts";
import { periodKey, completedDate } from "../../hooks/usePeriodKey.ts";

interface Props {
  tasks: Task[];
  unit: TimeUnit;
}

export function CashFlowChart({ tasks, unit }: Props) {
  const data = useMemo(() => {
    const started: Record<string, number> = {};
    const completed: Record<string, number> = {};
    const periods = new Set<string>();

    for (const t of tasks) {
      const sp = periodKey(t.first_clock_in, unit);
      started[sp] = (started[sp] || 0) + 1;
      periods.add(sp);

      const cd = completedDate(t);
      if (cd) {
        const cp = periodKey(cd, unit);
        completed[cp] = (completed[cp] || 0) + 1;
        periods.add(cp);
      }
    }

    const sorted = Array.from(periods).sort();
    let cumulative = 0;

    return sorted.map((p) => {
      const net = (completed[p] || 0) - (started[p] || 0);
      cumulative += net;
      return { period: p, CashFlow: cumulative };
    });
  }, [tasks, unit]);

  return (
    <div className="card full">
      <h3>Cash Flow (TOC)</h3>
      <p className="desc">
        週/月ごとの(完了数 - 新規着手数)を累積表示。右肩上がりなら在庫が減りスループットが勝っている健全な状態。右肩下がりなら着手過多で在庫が膨らんでいる
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="period" stroke="#8b949e" />
          <YAxis stroke="#8b949e" />
          <Tooltip
            contentStyle={{
              background: "#161b22",
              border: "1px solid #30363d",
            }}
          />
          <ReferenceLine y={0} stroke="#484f58" />
          <Line
            type="monotone"
            dataKey="CashFlow"
            stroke="#3fb950"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
