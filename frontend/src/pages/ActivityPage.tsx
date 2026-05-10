import { useMemo } from "react";
import { Box, Heading, Text, SimpleGrid } from "@chakra-ui/react";
import { useActivityData } from "../hooks/useActivityData.ts";
import { useTimeRange, rangeDates, unitForRange } from "../hooks/useTimeRange.ts";
import { TimeRangeSwitch } from "../components/TimeRangeSwitch.tsx";
import { ChartCard } from "../components/ChartCard.tsx";
import { ActivitySummary } from "../components/charts/ActivitySummary.tsx";
import { ActivityTrend } from "../components/charts/ActivityTrend.tsx";
import { ActivityHeatmap } from "../components/charts/ActivityHeatmap.tsx";
import { StreakTable } from "../components/charts/StreakTable.tsx";

export function ActivityPage() {
  const { data, error } = useActivityData();
  const { range, setRange } = useTimeRange();

  const unit = unitForRange(range);

  const { startedAt, finishedAt } = useMemo(() => {
    const d = rangeDates(range);
    return {
      startedAt: d.startedAt.toISOString().slice(0, 10),
      finishedAt: d.finishedAt.toISOString().slice(0, 10),
    };
  }, [range]);

  const filtered = useMemo(() => {
    if (!data) return null;
    const daily = data.daily.filter((d) => d.date >= startedAt);
    return { daily };
  }, [data, startedAt]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!data || !filtered) return <Box p={5}>Loading...</Box>;

  return (
    <Box p={5}>
      <Heading size="lg" color="blue.600" mb={1}>Activity Dashboard</Heading>
      <Text fontSize="xs" color="gray.400" mb={5}>
        Generated: {data.generated_at.slice(0, 16)} | {startedAt} ~ {finishedAt}
      </Text>
      <TimeRangeSwitch range={range} onChange={setRange} />
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
        <ChartCard title="Activity Summary" desc="各アクティビティの累計時間" full>
          <ActivitySummary daily={filtered.daily} />
        </ChartCard>
        <ChartCard title="Activity Trend" desc="期間ごとの投下時間推移" full>
          <ActivityTrend daily={filtered.daily} unit={unit} />
        </ChartCard>
        <ChartCard title="Activity Heatmap" desc="曜日×時間帯のアクティビティ分布（直近期間の日ごと投下時間）" full>
          <ActivityHeatmap daily={filtered.daily} />
        </ChartCard>
        <ChartCard title="Streaks" desc="連続実施日数と現在のストリーク" full>
          <StreakTable daily={filtered.daily} />
        </ChartCard>
      </SimpleGrid>
    </Box>
  );
}
