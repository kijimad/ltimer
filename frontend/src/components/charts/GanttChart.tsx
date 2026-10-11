import { useMemo, useState, type MouseEvent } from "react";
import { Box, Flex } from "@chakra-ui/react";
import type { Task, TaskClock } from "../../types/index.ts";
import { addDays, localDate } from "../../dates.ts";
import { useElementWidth } from "../../hooks/useElementWidth.ts";
import { STATUS_COLORS, GRID_STROKE, AXIS_STROKE, TOOLTIP_DIV_STYLE } from "./colors.ts";

interface Props {
  tasks: Task[];
  startedAt: string;
  asOf: string;
}

const LABEL_WIDTH = 170;
const ROW_HEIGHT = 18;
const AXIS_HEIGHT = 20;
const TICKS = 6;
/** 25分のセッションは数ヶ月の軸では1px未満になるので最小幅を持たせる */
const MIN_SESSION_PX = 2;
const SPAN_HEIGHT = 6;
const TOOLTIP_WIDTH = 240;

const toMs = (local: string) => new Date(local.replace(" ", "T")).getTime();

export function GanttChart({ tasks, startedAt, asOf }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>(600);
  const [hover, setHover] = useState<{ row: number; clock: TaskClock | undefined; x: number; y: number } | null>(null);
  const domainStart = toMs(`${startedAt} 00:00`);
  const domainEnd = toMs(`${addDays(asOf, 1)} 00:00`);

  const rows = useMemo(
    () =>
      tasks
        .map((t) => ({ task: t, clocks: t.clocks.filter((c) => toMs(c.end) >= domainStart) }))
        .filter((r) => r.clocks.length > 0)
        .sort((a, b) => (a.task.first_clock_in < b.task.first_clock_in ? -1 : 1)),
    [tasks, domainStart],
  );

  const x = (ms: number) => ((Math.min(Math.max(ms, domainStart), domainEnd) - domainStart) / (domainEnd - domainStart)) * width;
  const ticks = Array.from({ length: TICKS }, (_, i) => domainStart + ((domainEnd - domainStart) * i) / (TICKS - 1));
  const height = AXIS_HEIGHT + rows.length * ROW_HEIGHT;

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const row = Math.floor((my - AXIS_HEIGHT) / ROW_HEIGHT);
    if (row < 0 || row >= rows.length) return setHover(null);
    // 細いセッションにも当たるよう最小幅の分だけ判定を広げる
    const clock = rows[row].clocks.find(
      (c) => mx >= x(toMs(c.start)) - MIN_SESSION_PX && mx <= Math.max(x(toMs(c.end)), x(toMs(c.start)) + MIN_SESSION_PX) + MIN_SESSION_PX,
    );
    setHover({ row, clock, x: mx, y: my });
  };
  const hovered = hover ? rows[hover.row]?.task : undefined;

  return (
    <Flex>
      <Box width={`${LABEL_WIDTH}px`} flexShrink={0} pt={`${AXIS_HEIGHT}px`} pr={2}>
        {rows.map(({ task }, i) => (
          <Box
            key={i}
            height={`${ROW_HEIGHT}px`}
            lineHeight={`${ROW_HEIGHT}px`}
            fontSize="11px"
            color="gray.600"
            textAlign="right"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            title={task.title}
          >
            {task.title}
          </Box>
        ))}
      </Box>
      <Box ref={ref} flex="1" minW={0} position="relative">
        <svg width={width} height={height} role="img" aria-label="Gantt Chart" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {hover && hovered && <rect x={0} y={AXIS_HEIGHT + hover.row * ROW_HEIGHT} width={width} height={ROW_HEIGHT} fill={GRID_STROKE} opacity={0.5} />}
          {ticks.map((t, i) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={AXIS_HEIGHT} y2={height} stroke={GRID_STROKE} strokeDasharray="3 3" />
              <text x={x(t)} y={12} fontSize={10} fill={AXIS_STROKE} textAnchor={i === 0 ? "start" : i === TICKS - 1 ? "end" : "middle"}>
                {localDate(new Date(t))}
              </text>
            </g>
          ))}
          {rows.map(({ task, clocks }, i) => {
            const y = AXIS_HEIGHT + i * ROW_HEIGHT;
            const mid = y + ROW_HEIGHT / 2;
            const color = STATUS_COLORS[task.status];
            return (
              <g key={i}>
                <rect
                  x={x(toMs(task.first_clock_in))}
                  y={mid - SPAN_HEIGHT / 2}
                  width={x(toMs(task.last_clock_out)) - x(toMs(task.first_clock_in))}
                  height={SPAN_HEIGHT}
                  fill={color}
                  opacity={0.25}
                />
                {clocks.map((c) => {
                  const x0 = x(toMs(c.start));
                  return (
                    <rect key={c.start} x={x0} y={y + 3} width={Math.max(MIN_SESSION_PX, x(toMs(c.end)) - x0)} height={ROW_HEIGHT - 6} fill={color} />
                  );
                })}
              </g>
            );
          })}
        </svg>
        {hover && hovered && (
          <Box
            position="absolute"
            left={`${hover.x + 12 + TOOLTIP_WIDTH > width ? hover.x - 12 - TOOLTIP_WIDTH : hover.x + 12}px`}
            top={`${hover.y + 12}px`}
            width={`${TOOLTIP_WIDTH}px`}
            pointerEvents="none"
            zIndex={1}
            style={TOOLTIP_DIV_STYLE}
          >
            <div>{hovered.title}</div>
            <div>{hovered.first_clock_in} → {hovered.last_clock_out} ({hovered.lead_time_days}d, {hovered.status})</div>
            <div>{hovered.clock_count} セッション / {hovered.total_minutes} 分</div>
            {hover.clock && (
              <div>
                セッション: {hover.clock.start} →{" "}
                {hover.clock.end.slice(0, 10) === hover.clock.start.slice(0, 10) ? hover.clock.end.slice(11) : hover.clock.end} ({hover.clock.minutes} 分)
              </div>
            )}
          </Box>
        )}
      </Box>
    </Flex>
  );
}
