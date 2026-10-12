import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Flex, Box, Text } from "@chakra-ui/react";
import type { TaskRepository } from "../../data/repository.ts";
import { PACE_BANDS } from "../../metrics.ts";
import { agingBars, PACE_COLORS } from "./aging.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_DIV_STYLE } from "./colors.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  asOf: string;
}

export function AgingWip({ repo, startedAt, asOf }: Props) {
  const pace = useMemo(() => repo.leadTimePace(asOf), [repo, asOf]);
  const data = useMemo(() => agingBars(repo.agingTodos(startedAt, asOf), pace), [repo, startedAt, asOf, pace]);

  return (
    <Box>
      {pace && (
        <Flex gap={3} wrap="wrap" fontSize="xs" color="gray.500" mb={2}>
          {PACE_BANDS.map((label, i) => (
            <Flex key={label} align="center" gap={1}>
              <Box w="10px" h="10px" borderRadius="2px" bg={PACE_COLORS[i]} />
              <Text>{label}</Text>
            </Flex>
          ))}
        </Flex>
      )}
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ top: 16, left: 120, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis type="number" stroke={AXIS_STROKE} unit=" d" domain={[0, (max: number) => Math.max(max, pace?.p95 ?? 0)]} />
          <YAxis type="category" dataKey="title" stroke={AXIS_STROKE} width={110} tick={{ fontSize: 11 }} interval={0} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={TOOLTIP_DIV_STYLE}>
                  <div>{d.title}</div>
                  <div>{d.days} days{d.band && ` (過去の DONE の ${d.band})`}</div>
                </div>
              );
            }}
          />
          {pace && ([["p50", pace.p50], ["p85", pace.p85], ["p95", pace.p95]] as const).map(([label, x]) => (
            <ReferenceLine key={label} x={x} stroke={AXIS_STROKE} strokeDasharray="4 4" label={{ value: label, position: "top", fontSize: 10, fill: AXIS_STROKE }} />
          ))}
          <Bar dataKey="days" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
