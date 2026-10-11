import { useMemo } from "react";
import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import { useTimeRange, rangeDates, unitForRange } from "../hooks/useTimeRange.ts";
import { NavTimeRangeSwitch } from "../components/TimeRangeSwitch.tsx";
import { ChartCard } from "../components/ChartCard.tsx";
import { ActivitySummary } from "../components/charts/ActivitySummary.tsx";
import { ActivityTrend } from "../components/charts/ActivityTrend.tsx";
import { ActivityHeatmap } from "../components/charts/ActivityHeatmap.tsx";
import { StreakTable } from "../components/charts/StreakTable.tsx";
import { SummaryRow } from "../components/SummaryRow.tsx";
import { FooterGeneratedAt } from "../components/GeneratedAt.tsx";
import { useMountTime } from "../hooks/useMountTime.ts";
import { asOfDate } from "../dates.ts";
import { activitySummary } from "../db/summary.ts";
import { useDatabase } from "../hooks/useDatabase.ts";
import { generatedAt } from "../db/queries.ts";

export function ActivityPage() {
  const { db, error } = useDatabase();
  const { range } = useTimeRange();
  const now = useMountTime();

  const unit = unitForRange(range);

  const generated = useMemo(() => (db ? generatedAt(db) : null), [db]);
  const asOf = generated ? asOfDate(generated) : null;
  const dates = useMemo(() => (asOf ? rangeDates(range, asOf) : null), [range, asOf]);


  const summary = useMemo(() => (db && asOf ? activitySummary(db, asOf, range) : null), [db, asOf, range]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!db || !generated || !asOf || !dates || !summary) return <Box p={5}>Loading...</Box>;

  const { startedAt, finishedAt } = dates;

  return (
    <Box p={5}>
      <Heading size="lg" color="blue.600" mb={5}>Activity Dashboard</Heading>
      <FooterGeneratedAt generatedAt={generated} now={now} />
      <SummaryRow summary={summary} />
      <NavTimeRangeSwitch startedAt={startedAt} finishedAt={finishedAt} />
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
        <ChartCard title="Activity Summary" desc="各アクティビティの累計時間" full>
          <ActivitySummary db={db} startedAt={startedAt} />
        </ChartCard>
        <ChartCard title="Activity Trend" desc="期間ごとの投下時間推移" full>
          <ActivityTrend db={db} startedAt={startedAt} unit={unit} />
        </ChartCard>
        <ChartCard title="Activity Heatmap" desc="曜日×時間帯のアクティビティ分布（直近期間の日ごと投下時間）" full>
          <ActivityHeatmap db={db} startedAt={startedAt} />
        </ChartCard>
        <ChartCard title="Streaks" desc="連続実施日数と現在のストリーク" full>
          <StreakTable db={db} startedAt={startedAt} asOf={asOf} />
        </ChartCard>
      </SimpleGrid>
    </Box>
  );
}
