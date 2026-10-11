import { useMemo } from "react";
import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import { useWorkflowData } from "../hooks/useWorkflowData.ts";
import { useTimeRange, rangeDates, unitForRange } from "../hooks/useTimeRange.ts";
import { NavTimeRangeSwitch } from "../components/TimeRangeSwitch.tsx";
import { ChartCard } from "../components/ChartCard.tsx";
import { CHART_GROUPS } from "../chartConfig.tsx";
import { SummaryRow } from "../components/SummaryRow.tsx";
import { FooterGeneratedAt } from "../components/GeneratedAt.tsx";
import { useMountTime } from "../hooks/useMountTime.ts";
import { asOfDate } from "../dates.ts";
import { taskSummary } from "../db/summary.ts";
import { useDatabase } from "../hooks/useDatabase.ts";

export function TasksPage() {
  const { data, error } = useWorkflowData();
  const { range } = useTimeRange();
  const now = useMountTime();

  const unit = unitForRange(range);

  const asOf = data ? asOfDate(data.generated_at) : null;
  const dates = useMemo(() => (asOf ? rangeDates(range, asOf) : null), [range, asOf]);

  const filtered = useMemo(() => {
    if (!data || !dates) return null;
    const { startedAt } = dates;
    const tasks = data.tasks.filter(
      (t) => t.last_clock_out.slice(0, 10) >= startedAt || t.first_clock_in.slice(0, 10) >= startedAt
    );
    const dailyWork = data.daily_work.filter((d) => d.date >= startedAt);
    return { tasks, dailyWork };
  }, [data, dates]);

  const { db } = useDatabase();
  const summary = useMemo(() => (db && asOf ? taskSummary(db, asOf, range) : null), [db, asOf, range]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!data || !asOf || !dates || !filtered || !summary) return <Box p={5}>Loading...</Box>;

  const { startedAt, finishedAt } = dates;
  const chartProps = { tasks: filtered.tasks, dailyWork: filtered.dailyWork, unit, startedAt, asOf };

  return (
    <Box p={5}>
      <Heading size="lg" color="blue.600" mb={5}>Lead Time Dashboard</Heading>
      <FooterGeneratedAt generatedAt={data.generated_at} now={now} />
      <SummaryRow summary={summary} />
      <NavTimeRangeSwitch startedAt={startedAt} finishedAt={finishedAt} />
      {CHART_GROUPS.map((group) => (
        <Box key={group.key} mb={8}>
          <Heading size="md" color="gray.600" mb={3} pb={1} borderBottom="1px solid" borderColor="gray.200">
            {group.label}
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            {group.charts.map((c) => (
              <ChartCard key={c.key} title={c.title} desc={c.desc} full={c.full}>
                {c.render(chartProps)}
              </ChartCard>
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </Box>
  );
}
