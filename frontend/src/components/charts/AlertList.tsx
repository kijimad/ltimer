import { useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import type { Database } from "sql.js";
import { alertTodos } from "../../db/charts.ts";
import { shortName } from "../../hooks/usePeriodKey.ts";
import { AGING_THRESHOLD_DAYS } from "./colors.ts";

interface Props {
  db: Database;
  startedAt: string;
}

export function AlertList({ db, startedAt }: Props) {
  const alerts = useMemo(() => alertTodos(db, startedAt, AGING_THRESHOLD_DAYS), [db, startedAt]);

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
