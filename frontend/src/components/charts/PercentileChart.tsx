import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import type { TimeUnit } from "../../types/index.ts";
import type { TaskRepository } from "../../data/repository.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  unit: TimeUnit;
}

export function PercentileChart({ repo, startedAt, unit }: Props) {
  const { data, globalP85 } = useMemo(() => repo.leadTimePercentiles(startedAt, unit), [repo, startedAt, unit]);


  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#A0AEC0" />
        <YAxis stroke="#A0AEC0" unit=" d" />
        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0" }} />
        <Legend />
        <ReferenceLine y={globalP85} stroke="#CBD5E0" strokeDasharray="5 5" label={{ value: `SLE: ${globalP85}d`, position: "right", fill: "#A0AEC0", fontSize: 11 }} />
        <Line type="monotone" dataKey="p50" name="50th" stroke="#3fb950" isAnimationActive={false} />
        <Line type="monotone" dataKey="p85" name="85th" stroke="#f0883e" isAnimationActive={false} />
        <Line type="monotone" dataKey="p95" name="95th" stroke="#f85149" isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
