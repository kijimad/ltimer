import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Text } from "@chakra-ui/react";
import type { NoteRepository } from "../../data/repository.ts";
import { daysToPublish } from "./notes.ts";
import { NOTE_STATUS, GRID_STROKE, AXIS_STROKE, TOOLTIP_DIV_STYLE } from "./colors.ts";

interface Props {
  repo: NoteRepository;
  startedAt: string;
  asOf: string;
}

export function NoteLeadTimeChart({ repo, startedAt, asOf }: Props) {
  const data = useMemo(() => daysToPublish(repo.inRange(startedAt), asOf).map((d) => ({ ...d, name: d.title.slice(0, 30) })), [repo, startedAt, asOf]);

  if (data.length === 0) return <Text color="gray.500">No data</Text>;

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis type="number" stroke={AXIS_STROKE} unit=" d" />
        <YAxis type="category" dataKey="name" stroke={AXIS_STROKE} width={120} tick={{ fontSize: 11 }} interval={0} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload;
            return (
              <div style={TOOLTIP_DIV_STYLE}>
                <div>{d.title}</div>
                <div>{d.days}d ({d.status === "draft" ? "下書きの経過" : "公開まで"})</div>
              </div>
            );
          }}
        />
        <Bar dataKey="days" isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={NOTE_STATUS[d.status].color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
