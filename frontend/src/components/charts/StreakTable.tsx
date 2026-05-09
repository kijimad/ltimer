import { useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import type { ActivityDailyEntry } from "../../types/index.ts";

interface Props {
  daily: ActivityDailyEntry[];
}

function calcStreak(title: string, daily: ActivityDailyEntry[]): { current: number; max: number } {
  const activeDates = new Set<string>();
  for (const d of daily) {
    if (d.activities.some((a) => a.title === title)) {
      activeDates.add(d.date);
    }
  }

  const sorted = Array.from(activeDates).sort();
  if (sorted.length === 0) return { current: 0, max: 0 };

  let max = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 1;
    }
  }

  const lastDate = new Date(sorted[sorted.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentStreak = daysSinceLast <= 1 ? cur : 0;

  return { current: currentStreak, max };
}

export function StreakTable({ daily }: Props) {
  const streaks = useMemo(() => {
    // Collect all activity titles from daily data
    const titleSet = new Set<string>();
    for (const d of daily) {
      for (const a of d.activities) titleSet.add(a.title);
    }

    const totalDays = new Set(daily.map((d) => d.date)).size;

    return Array.from(titleSet).map((title) => {
      const { current, max } = calcStreak(title, daily);
      const recentDays = new Set(
        daily.filter((d) => d.activities.some((a) => a.title === title)).map((d) => d.date),
      ).size;
      const rate = totalDays > 0 ? Math.round((recentDays / totalDays) * 100) : 0;
      return { title, current, max, recentDays, rate };
    }).sort((a, b) => b.rate - a.rate);
  }, [daily]);

  if (streaks.length === 0) return <Text color="gray.500">No data</Text>;

  return (
    <Box as="table" width="100%" fontSize="sm">
      <Box as="thead">
        <Box as="tr" borderBottom="1px solid" borderColor="gray.200">
          <Box as="th" textAlign="left" py={2} color="gray.600">Activity</Box>
          <Box as="th" textAlign="right" py={2} color="gray.600">Current</Box>
          <Box as="th" textAlign="right" py={2} color="gray.600">Max</Box>
          <Box as="th" textAlign="right" py={2} color="gray.600">Rate</Box>
        </Box>
      </Box>
      <Box as="tbody">
        {streaks.map((s) => (
          <Box as="tr" key={s.title} borderBottom="1px solid" borderColor="gray.100">
            <Box as="td" py={2}>{s.title}</Box>
            <Box as="td" textAlign="right" py={2} fontWeight={s.current > 0 ? "bold" : "normal"} color={s.current > 0 ? "green.500" : "gray.400"}>
              {s.current}d
            </Box>
            <Box as="td" textAlign="right" py={2} color="blue.500">{s.max}d</Box>
            <Box as="td" textAlign="right" py={2}>
              <Box as="span" color={s.rate >= 80 ? "green.500" : s.rate >= 50 ? "orange.400" : "gray.500"}>
                {s.rate}%
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
