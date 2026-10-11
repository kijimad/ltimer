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
import { useRepository } from "../hooks/useRepository.ts";

export function TasksPage() {
  const { repo, error } = useRepository();
  const { range } = useTimeRange();
  const now = useMountTime();

  const unit = unitForRange(range);

  const generated = useMemo(() => (repo ? repo.generatedAt() : null), [repo]);
  const asOf = generated ? asOfDate(generated) : null;
  const dates = useMemo(() => (asOf ? rangeDates(range, asOf) : null), [range, asOf]);

  const tasks = useMemo(() => (repo && dates ? repo.tasks.inRange(dates.startedAt) : null), [repo, dates]);

  const summary = useMemo(() => (repo && asOf ? repo.tasks.summary(asOf, range) : null), [repo, asOf, range]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!repo || !generated || !asOf || !dates || !tasks || !summary) return <Box p={5}>Loading...</Box>;

  const { startedAt, finishedAt } = dates;
  const chartProps = { repo: repo.tasks, tasks, unit, startedAt, asOf };

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
