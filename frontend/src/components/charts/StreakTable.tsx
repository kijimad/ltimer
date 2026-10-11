import { useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import type { Database } from "sql.js";
import { activityStreaks } from "../../db/charts.ts";

interface Props {
  db: Database;
  startedAt: string;
  asOf: string;
}

export function StreakTable({ db, startedAt, asOf }: Props) {
  const streaks = useMemo(
    () =>
      activityStreaks(db, startedAt, asOf)
        .map((s) => ({ ...s, rate: Math.round(s.rate) }))
        .sort((a, b) => b.rate - a.rate),
    [db, startedAt, asOf],
  );

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
