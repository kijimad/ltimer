import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Box, Flex, Text } from "@chakra-ui/react";
import type { TaskRepository } from "../../data/repository.ts";
import { dailyRhythm, WEEKDAY_LABELS } from "../../metrics.ts";
import { AXIS_STROKE, TOOLTIP_DIV_STYLE } from "./colors.ts";
import type { RhythmPoint } from "../../metrics.ts";

interface Props {
  repo: Pick<TaskRepository, "workByWeekdayHour">;
  startedAt: string;
  asOf: string;
}

// 平日は寒色、週末は暖色にして、平日と週末の違いも色で読めるようにする
const WEEKDAY_COLORS = ["#1f6feb", "#388bfd", "#58a6ff", "#79c0ff", "#a5d6ff", "#f0883e", "#f85149"];
const ROW_HEIGHT = 44;

export function RhythmTooltip({ point }: { point: RhythmPoint }) {
  return (
    <div style={TOOLTIP_DIV_STYLE}>
      <div>{point.hour}時台 (分/日)</div>
      {WEEKDAY_LABELS.map((label, w) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: WEEKDAY_COLORS[w] }} />
          <span>{label}</span>
          <span style={{ marginLeft: "auto" }}>{point[label]}</span>
        </div>
      ))}
    </div>
  );
}
const AXIS_HEIGHT = 20;

/** 段の軸をそろえて、曜日どうしで高さを比べられるようにする */
export function TimeOfDayChart({ repo, startedAt, asOf }: Props) {
  const data = useMemo(() => dailyRhythm(repo.workByWeekdayHour(startedAt), startedAt, asOf), [repo, startedAt, asOf]);
  const max = Math.max(1, ...data.flatMap((p) => WEEKDAY_LABELS.map((l) => p[l])));
  // syncId で全段のツールチップが同時に出るので、ポインタのある段だけに出す
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <Box>
      {WEEKDAY_LABELS.map((label, w) => {
        const last = w === WEEKDAY_LABELS.length - 1;
        return (
          <Flex key={label} align="center">
            <Text fontSize="xs" color="gray.500" w="24px" flexShrink={0} pb={last ? `${AXIS_HEIGHT}px` : 0}>
              {label}
            </Text>
            <Box flex="1" minW={0} role="img" aria-label={`${label}曜日`} onMouseEnter={() => setHoveredRow(w)} onMouseLeave={() => setHoveredRow(null)}>
              <ResponsiveContainer width="100%" height={ROW_HEIGHT + (last ? AXIS_HEIGHT : 0)}>
                <AreaChart data={data} syncId="time-of-day" margin={{ top: 2, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="hour" hide={!last} stroke={AXIS_STROKE} tickFormatter={(h: number) => `${h}時`} interval={2} height={AXIS_HEIGHT} />
                  <YAxis hide domain={[0, max]} />
                  <Tooltip
                    allowEscapeViewBox={{ x: false, y: true }}
                    wrapperStyle={{ zIndex: 10 }}
                    content={({ active, payload }) =>
                      active && hoveredRow === w && payload?.[0] ? <RhythmTooltip point={payload[0].payload as RhythmPoint} /> : null
                    }
                  />
                  <Area type="monotone" dataKey={label} stroke={WEEKDAY_COLORS[w]} fill={WEEKDAY_COLORS[w]} fillOpacity={0.35} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Flex>
        );
      })}
    </Box>
  );
}
