import { useMemo } from "react";
import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import { useTimeRange, rangeDates, unitForRange } from "../hooks/useTimeRange.ts";
import { NavTimeRangeSwitch } from "../components/TimeRangeSwitch.tsx";
import { ChartCard } from "../components/ChartCard.tsx";
import { ActivitySummary } from "../components/charts/ActivitySummary.tsx";
import { ActivityTrend } from "../components/charts/ActivityTrend.tsx";
import { TimeOfDayChart } from "../components/charts/TimeOfDayChart.tsx";
import { StreakTable } from "../components/charts/StreakTable.tsx";
import { SummaryRow } from "../components/SummaryRow.tsx";
import { FooterGeneratedAt } from "../components/GeneratedAt.tsx";
import { useMountTime } from "../hooks/useMountTime.ts";
import { asOfDate } from "../dates.ts";
import { useRepository } from "../hooks/useRepository.ts";

export function ActivityPage() {
  const { repo, error } = useRepository();
  const { range } = useTimeRange();
  const now = useMountTime();

  const unit = unitForRange(range);

  const generated = useMemo(() => (repo ? repo.generatedAt() : null), [repo]);
  const asOf = generated ? asOfDate(generated) : null;
  const dates = useMemo(() => (asOf ? rangeDates(range, asOf) : null), [range, asOf]);


  const summary = useMemo(() => (repo && asOf ? repo.activities.summary(asOf, range) : null), [repo, asOf, range]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!repo || !generated || !asOf || !dates || !summary) return <Box p={5}>Loading...</Box>;

  const { startedAt, finishedAt } = dates;

  return (
    <Box p={5}>
      <Heading size="lg" color="blue.600" mb={5}>Activity Dashboard</Heading>
      <FooterGeneratedAt generatedAt={generated} now={now} />
      <SummaryRow summary={summary} />
      <NavTimeRangeSwitch startedAt={startedAt} finishedAt={finishedAt} />
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
        <ChartCard title="Activity Summary" desc="各アクティビティの累計時間" full>
          <ActivitySummary repo={repo.activities} startedAt={startedAt} />
        </ChartCard>
        <ChartCard title="Activity Trend" desc="期間ごとの投下時間推移" full>
          <ActivityTrend repo={repo.activities} startedAt={startedAt} unit={unit} />
        </ChartCard>
        <ChartCard title="Time of Day" desc="時間帯ごとの1日あたり平均投下時間を曜日ごとに比べる。各セッションを開始した時間帯に数え、合計を範囲内のその曜日の日数で割る" full>
          <TimeOfDayChart repo={repo.activities} startedAt={startedAt} asOf={asOf} />
        </ChartCard>
        <ChartCard title="Streaks" desc="連続実施日数と現在のストリーク" full>
          <StreakTable repo={repo.activities} startedAt={startedAt} asOf={asOf} />
        </ChartCard>
      </SimpleGrid>
    </Box>
  );
}
