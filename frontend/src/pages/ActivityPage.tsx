import { useMemo } from "react";
import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import { useActivityData } from "../hooks/useActivityData.ts";
import { useTimeRange, rangeDates, unitForRange } from "../hooks/useTimeRange.ts";
import { NavTimeRangeSwitch } from "../components/TimeRangeSwitch.tsx";
import { ChartCard } from "../components/ChartCard.tsx";
import { ActivitySummary } from "../components/charts/ActivitySummary.tsx";
import { ActivityTrend } from "../components/charts/ActivityTrend.tsx";
import { ActivityHeatmap } from "../components/charts/ActivityHeatmap.tsx";
import { StreakTable } from "../components/charts/StreakTable.tsx";
import { SummaryRow } from "../components/SummaryRow.tsx";
import { GeneratedAt } from "../components/GeneratedAt.tsx";
import { useMountTime } from "../hooks/useMountTime.ts";
import { asOfDate } from "../dates.ts";
import { activitySummary } from "../metrics.ts";

export function ActivityPage() {
  const { data, error } = useActivityData();
  const { range } = useTimeRange();
  const now = useMountTime();

  const unit = unitForRange(range);

  const asOf = data ? asOfDate(data.generated_at) : null;
  const dates = useMemo(() => (asOf ? rangeDates(range, asOf) : null), [range, asOf]);

  const filtered = useMemo(() => {
    if (!data || !dates) return null;
    const daily = data.daily.filter((d) => d.date >= dates.startedAt);
    return { daily };
  }, [data, dates]);

  const summary = useMemo(() => (data && asOf ? activitySummary(data.daily, asOf, range) : null), [data, asOf, range]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!data || !asOf || !dates || !filtered || !summary) return <Box p={5}>Loading...</Box>;

  const { startedAt, finishedAt } = dates;

  return (
    <Box p={5}>
      <Heading size="lg" color="blue.600" mb={1}>Activity Dashboard</Heading>
      <GeneratedAt generatedAt={data.generated_at} now={now} />
      <SummaryRow summary={summary} />
      <NavTimeRangeSwitch startedAt={startedAt} finishedAt={finishedAt} />
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
          <StreakTable daily={filtered.daily} asOf={asOf} />
        </ChartCard>
      </SimpleGrid>
    </Box>
  );
}
