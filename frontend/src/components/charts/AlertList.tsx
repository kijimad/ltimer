import { useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import type { Task } from "../../types/index.ts";
import { shortName } from "../../hooks/usePeriodKey.ts";
import { AGING_THRESHOLD_DAYS } from "./colors.ts";

interface Props {
  tasks: Task[];
}

export function AlertList({ tasks }: Props) {
  const alerts = useMemo(() => {
    return tasks
      .filter((t) => t.status === "TODO" && t.lead_time_days > AGING_THRESHOLD_DAYS)
      .sort((a, b) => b.lead_time_days - a.lead_time_days);
  }, [tasks]);

  if (alerts.length === 0) return <Text color="gray.500">No alerts</Text>;

  return (
    <>
      {alerts.map((t, i) => (
        <Box
          key={i}
          padding="8px 12px"
          borderBottom="1px solid"
          borderColor="gray.100"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Text as="span" color="red.500" fontWeight="bold">
              {t.lead_time_days}d
            </Text>{" "}
            <Text as="span" color="gray.800">{t.title}</Text>
            <br />
            <Text as="span" fontSize="sm" color="gray.500">
              {shortName(t.file)}
            </Text>
          </Box>
        </Box>
      ))}
    </>
  );
}
