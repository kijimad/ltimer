import { useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { TimeUnit } from "../../types/index.ts";
import type { TaskRepository } from "../../data/repository.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  unit: TimeUnit;
}

export function LittlesLaw({ repo, startedAt, unit }: Props) {
  const data = useMemo(
    () =>
      repo.wipByPeriod(startedAt, unit).map(({ period, wip, throughput, avgLead }) => ({
        period,
        "Actual LT": avgLead === null ? 0 : Math.round(avgLead * 10) / 10,
        "Predicted (WIP/T)": throughput > 0 ? Math.round((wip / throughput) * 10) / 10 : 0,
        WIP: wip,
      })),
    [repo, startedAt, unit],
  );

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" stroke="#A0AEC0" />
        <YAxis yAxisId="left" stroke="#A0AEC0" label={{ value: "Days", angle: -90, position: "insideLeft" }} />
        <YAxis yAxisId="right" orientation="right" stroke="#A0AEC0" label={{ value: "WIP", angle: 90, position: "insideRight" }} />
        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0" }} />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="Actual LT" stroke="#3fb950" isAnimationActive={false} />
        <Line yAxisId="left" type="monotone" dataKey="Predicted (WIP/T)" stroke="#f0883e" strokeDasharray="5 5" isAnimationActive={false} />
        <Bar yAxisId="right" dataKey="WIP" fill="#58a6ff" opacity={0.3} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
