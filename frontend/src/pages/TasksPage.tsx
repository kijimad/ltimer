import { useMemo } from "react";
import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
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
import { generatedAt } from "../db/queries.ts";
import { tasksInRange } from "../db/charts.ts";

export function TasksPage() {
  const { db, error } = useDatabase();
  const { range } = useTimeRange();
  const now = useMountTime();

  const unit = unitForRange(range);

  const generated = useMemo(() => (db ? generatedAt(db) : null), [db]);
  const asOf = generated ? asOfDate(generated) : null;
  const dates = useMemo(() => (asOf ? rangeDates(range, asOf) : null), [range, asOf]);

  const tasks = useMemo(() => (db && dates ? tasksInRange(db, dates.startedAt) : null), [db, dates]);

  const summary = useMemo(() => (db && asOf ? taskSummary(db, asOf, range) : null), [db, asOf, range]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!db || !generated || !asOf || !dates || !tasks || !summary) return <Box p={5}>Loading...</Box>;

  const { startedAt, finishedAt } = dates;
  const chartProps = { db, tasks, unit, startedAt, asOf };

  return (
    <Box p={5}>
      <Heading size="lg" color="blue.600" mb={5}>Lead Time Dashboard</Heading>
      <FooterGeneratedAt generatedAt={generated} now={now} />
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
