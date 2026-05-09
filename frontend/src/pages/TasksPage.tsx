import { useMemo } from "react";
import { Box, Heading, Text, SimpleGrid } from "@chakra-ui/react";
import { useWorkflowData } from "../hooks/useWorkflowData.ts";
import { useTimeRange, rangeStartDate, unitForRange } from "../hooks/useTimeRange.ts";
import { TimeRangeSwitch } from "../components/TimeRangeSwitch.tsx";
import { ChartCard } from "../components/ChartCard.tsx";
import { CHART_GROUPS } from "../chartConfig.tsx";

export function TasksPage() {
  const { data, error } = useWorkflowData();
  const { range, setRange } = useTimeRange();

  const unit = unitForRange(range);

  const filtered = useMemo(() => {
    if (!data) return null;
    const cutoff = rangeStartDate(range).toISOString();
    const tasks = data.tasks.filter(
      (t) => t.last_clock_out >= cutoff || t.first_clock_in >= cutoff
    );
    const dailyWork = data.daily_work.filter((d) => d.date >= cutoff.slice(0, 10));
    return { tasks, dailyWork };
  }, [data, range]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!data || !filtered) return <Box p={5}>Loading...</Box>;

  const chartProps = { tasks: filtered.tasks, dailyWork: filtered.dailyWork, unit };

  return (
    <Box p={5}>
      <Heading size="lg" color="blue.600" mb={1}>Lead Time Dashboard</Heading>
      <Text fontSize="xs" color="gray.400" mb={5}>
        Generated: {data.generated_at.slice(0, 16)} | Cutoff: {data.cutoff_date}
      </Text>
      <TimeRangeSwitch range={range} onChange={setRange} />
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
