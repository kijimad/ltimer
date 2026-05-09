import { useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import type { ActivityDailyEntry } from "../../types/index.ts";

interface Props {
  daily: ActivityDailyEntry[];
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

export function ActivityHeatmap({ daily }: Props) {
  const { grid, weeks } = useMemo(() => {
    const minutesByDate: Record<string, number> = {};
    for (const d of daily) {
      minutesByDate[d.date] = d.activities.reduce((s, a) => s + a.minutes, 0);
    }

    if (daily.length === 0) return { grid: [], weeks: 0 };

    const dates = Object.keys(minutesByDate).sort();
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);

    // Align to Monday
    const startDay = startDate.getDay();
    const alignedStart = new Date(startDate);
    alignedStart.setDate(alignedStart.getDate() - ((startDay + 6) % 7));

    const grid: { date: string; minutes: number; dayOfWeek: number; week: number }[] = [];
    const current = new Date(alignedStart);
    let week = 0;

    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const dayOfWeek = (current.getDay() + 6) % 7; // Mon=0
      grid.push({
        date: dateStr,
        minutes: minutesByDate[dateStr] || 0,
        dayOfWeek,
        week,
      });
      current.setDate(current.getDate() + 1);
      if (dayOfWeek === 6) week++;
    }

    return { grid, weeks: week + 1 };
  }, [daily]);

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
