import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Box, Text } from "@chakra-ui/react";
import type { TimeUnit } from "../../types/index.ts";
import type { TaskRepository } from "../../data/repository.ts";
import { historyStart, isCompletePeriod, processBehavior, MIN_XMR_POINTS, type ProcessLimits, type ProcessSignal } from "../../metrics.ts";
import { GRID_STROKE, AXIS_STROKE, TOOLTIP_STYLE } from "./colors.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  asOf: string;
  unit: TimeUnit;
}

interface Point {
  period: string;
  value: number | null;
  complete: boolean;
  signal: ProcessSignal | null;
}

const LINE_COLOR = "#58a6ff";
const LIMIT_COLOR = "#f85149";
const SIGNAL_COLORS: Record<ProcessSignal, string> = { limit: LIMIT_COLOR, "near-limit": "#f0883e", run: "#d29922" };

export function ProcessBehaviorChart({ repo, startedAt, asOf, unit }: Props) {
  const panels = useMemo(() => {
    const points = repo.wipByPeriod(historyStart(startedAt, asOf, unit), unit);
    const complete = points.map((p) => isCompletePeriod(p, unit, asOf));
    const panel = (title: string, unitLabel: string, values: (number | null)[]) => {
      const { limits, signals } = processBehavior(values, complete);
      const data: Point[] = points.map((p, i) => ({
        period: p.period,
        value: values[i] === null ? null : Math.round(values[i]! * 10) / 10,
        complete: complete[i],
        signal: signals[i],
      }));
      return { title, unitLabel, data, limits };
    };
    return [
      panel("Throughput", "件", points.map((p) => p.throughput)),
      panel("平均リードタイム", "日", points.map((p) => p.avgLead)),
    ];
  }, [repo, startedAt, asOf, unit]);

  return (
    <Box>
      {panels.map((p) => (
        <Panel key={p.title} {...p} />
      ))}
    </Box>
  );
}

function Panel({ title, unitLabel, data, limits }: { title: string; unitLabel: string; data: Point[]; limits: ProcessLimits | null }) {
  return (
    <Box mb={4}>
      <Text fontSize="sm" color="gray.600">
        {title} ({unitLabel})
        {limits === null && ` — 欠けのない期間が${MIN_XMR_POINTS}つ以上そろうと限界線を引く`}
      </Text>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 12, right: 52, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="period" stroke={AXIS_STROKE} tick={{ fontSize: 11 }} />
          <YAxis stroke={AXIS_STROKE} domain={[0, (max: number) => Math.ceil(Math.max(max, limits?.upper ?? 0))]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, title]} />
          {limits && (
            <>
              <ReferenceLine y={limits.center} stroke={AXIS_STROKE} label={{ value: "中央値", position: "right", fontSize: 10, fill: AXIS_STROKE }} />
              <ReferenceLine y={limits.upper} stroke={LIMIT_COLOR} strokeDasharray="4 4" label={{ value: "上限", position: "right", fontSize: 10, fill: LIMIT_COLOR }} />
              {limits.lower > 0 && (
                <ReferenceLine y={limits.lower} stroke={LIMIT_COLOR} strokeDasharray="4 4" label={{ value: "下限", position: "right", fontSize: 10, fill: LIMIT_COLOR }} />
              )}
            </>
          )}
          <Line
            type="linear"
            dataKey="value"
            stroke={LINE_COLOR}
            isAnimationActive={false}
            dot={({ cx, cy, payload, index }) => {
              // 値のない期間にも呼ばれるので、点を描かない
              if (payload.value === null) return <g key={index} />;
              const color = payload.signal ? SIGNAL_COLORS[payload.signal as ProcessSignal] : LINE_COLOR;
              // 欠けのある期間は限界線の計算に入れないので白抜きにする
              return <circle key={index} cx={cx} cy={cy} r={payload.signal ? 5 : 3} fill={payload.complete ? color : "#fff"} stroke={color} />;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
