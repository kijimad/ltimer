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
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#A0AEC0" />
        <YAxis stroke="#A0AEC0" />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e2e8f0",
          }}
        />
        <ReferenceLine y={0} stroke="#CBD5E0" />
        <Line
          type="monotone"
          dataKey="CashFlow"
          stroke="#3fb950"
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
