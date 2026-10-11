import { useMemo } from "react";
import { Box, Heading, Text, SimpleGrid } from "@chakra-ui/react";
import { useWorkflowData } from "../hooks/useWorkflowData.ts";
import { useTimeRange, rangeDates, unitForRange } from "../hooks/useTimeRange.ts";
import { TimeRangeSwitch } from "../components/TimeRangeSwitch.tsx";
import { ChartCard } from "../components/ChartCard.tsx";
import { CHART_GROUPS } from "../chartConfig.tsx";
import { SummaryRow } from "../components/SummaryRow.tsx";
import { asOfDate, formatGeneratedAt } from "../dates.ts";
import { taskSummary } from "../metrics.ts";

export function TasksPage() {
  const { data, error } = useWorkflowData();
  const { range, setRange } = useTimeRange();

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

  const summary = useMemo(() => (data && asOf ? taskSummary(data.tasks, asOf) : null), [data, asOf]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!data || !asOf || !dates || !filtered || !summary) return <Box p={5}>Loading...</Box>;

  const { startedAt, finishedAt } = dates;
  const chartProps = { tasks: filtered.tasks, dailyWork: filtered.dailyWork, unit, startedAt, asOf };

  return (
    <Box p={5}>
      <Heading size="lg" color="blue.600" mb={1}>Lead Time Dashboard</Heading>
      <Text fontSize="xs" color="gray.400" mb={5}>
        Generated: {formatGeneratedAt(data.generated_at)}
      </Text>
      <SummaryRow summary={summary} />
      <TimeRangeSwitch range={range} onChange={setRange} startedAt={startedAt} finishedAt={finishedAt} />
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
