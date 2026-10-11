import { useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import type { Database } from "sql.js";
import { activityMinutesByDate } from "../../db/charts.ts";
import { addDays, daysBetween } from "../../dates.ts";

interface Props {
  db: Database;
  startedAt: string;
}

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];
const CELL_SIZE = 14;
const CELL_GAP = 2;

function getColor(minutes: number): string {
  if (minutes === 0) return "#ebedf0";
  if (minutes < 30) return "#9be9a8";
  if (minutes < 90) return "#40c463";
  if (minutes < 180) return "#30a14e";
  return "#216e39";
}

export function ActivityHeatmap({ db, startedAt }: Props) {
  const { grid, weeks } = useMemo(() => {
    const byDate = activityMinutesByDate(db, startedAt);
    if (byDate.length === 0) return { grid: [], weeks: 0 };
    const minutes = new Map(byDate.map((d) => [d.date, d.minutes]));

    // 先頭の日を含む週の月曜から最後の日まで。曜日は月曜を 0 とする
    const first = byDate[0].date;
    const alignedStart = addDays(first, -((new Date(`${first}T00:00:00`).getDay() + 6) % 7));
    const days = daysBetween(alignedStart, byDate[byDate.length - 1].date) + 1;
    const grid = Array.from({ length: days }, (_, i) => {
      const date = addDays(alignedStart, i);
      return { date, minutes: minutes.get(date) ?? 0, dayOfWeek: i % 7, week: Math.floor(i / 7) };
    });
    return { grid, weeks: Math.floor(days / 7) + 1 };
  }, [db, startedAt]);

  if (grid.length === 0) return <Text color="gray.500">No data</Text>;

  const width = weeks * (CELL_SIZE + CELL_GAP) + 30;

  return (
    <Box overflowX="auto">
      <svg width={width} height={7 * (CELL_SIZE + CELL_GAP) + 20}>
        {DAY_LABELS.map((label, i) => (
          <text
            key={label}
            x={0}
            y={i * (CELL_SIZE + CELL_GAP) + CELL_SIZE + 12}
            fontSize={10}
            fill="#A0AEC0"
          >
            {label}
          </text>
        ))}
        {grid.map((cell) => (
          <rect
            key={cell.date}
            x={cell.week * (CELL_SIZE + CELL_GAP) + 24}
            y={cell.dayOfWeek * (CELL_SIZE + CELL_GAP) + 6}
            width={CELL_SIZE}
            height={CELL_SIZE}
            rx={2}
            fill={getColor(cell.minutes)}
          >
            <title>{`${cell.date}: ${cell.minutes}min`}</title>
          </rect>
        ))}
      </svg>
      <Box display="flex" gap={1} alignItems="center" mt={1} ml="24px">
        <Text fontSize="xs" color="gray.400" mr={1}>少</Text>
        {[0, 29, 89, 179, 180].map((m) => (
          <Box key={m} w="12px" h="12px" borderRadius="2px" bg={getColor(m)} />
        ))}
        <Text fontSize="xs" color="gray.400" ml={1}>多</Text>
      </Box>
    </Box>
  );
}
