import { useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Box, Text } from "@chakra-ui/react";
import type { TaskRepository } from "../../data/repository.ts";
import { estimateAccuracy, ESTIMATE_TOLERANCE } from "../../metrics.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_DIV_STYLE } from "./colors.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
}

const hours = (minutes: number) => Math.round((minutes / 60) * 10) / 10;

/** 見積もりも実績も数十分から数十時間まで広がるので、両軸を対数にする */
export function EstimateChart({ repo, startedAt }: Props) {
  const { data, accuracy, max } = useMemo(() => {
    const estimates = repo.estimates(startedAt);
    // 対数軸に 0 は置けないので、軸の下端の 0.1h で止める
    const data = estimates.map((e) => ({ title: e.title, effort: Math.max(0.1, hours(e.effortMinutes)), actual: Math.max(0.1, hours(e.actualMinutes)) }));
    return { data, accuracy: estimateAccuracy(estimates), max: Math.max(1, ...data.flatMap((d) => [d.effort, d.actual])) };
  }, [repo, startedAt]);

  if (accuracy === null) return <Text color="gray.500">No data</Text>;

  return (
    <Box>
      <Text fontSize="sm" color="gray.600" mb={2}>
        {accuracy.count}件 / 実績÷見積もりの中央値 {Math.round(accuracy.medianRatio * 100) / 100}倍 / 見積もりどおり (÷{ESTIMATE_TOLERANCE}〜×{ESTIMATE_TOLERANCE}) {Math.round(accuracy.withinRate)}%
      </Text>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis type="number" dataKey="effort" name="見積もり" unit="h" scale="log" domain={[0.1, max]} allowDataOverflow stroke={AXIS_STROKE} />
          <YAxis type="number" dataKey="actual" name="実績" unit="h" scale="log" domain={[0.1, max]} allowDataOverflow stroke={AXIS_STROKE} />
          <ReferenceLine segment={[{ x: 0.1, y: 0.1 }, { x: max, y: max }]} stroke={AXIS_STROKE} strokeDasharray="4 4" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={TOOLTIP_DIV_STYLE}>
                  <div>{d.title}</div>
                  <div>見積もり {d.effort}h / 実績 {d.actual}h</div>
                </div>
              );
            }}
          />
          <Scatter data={data} fill="#58a6ff" isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </Box>
  );
}
