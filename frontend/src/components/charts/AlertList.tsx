import { useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import type { TaskRepository } from "../../data/repository.ts";
import { shortName } from "../../hooks/usePeriodKey.ts";
import { AGING_THRESHOLD_DAYS } from "./colors.ts";

interface Props {
  repo: TaskRepository;
  startedAt: string;
  asOf: string;
}

/** Aging WIP の色と同じく、過去の DONE の p85 を超えたら警告する。DONE が少ないうちは決め打ちの日数 */
export function AlertList({ repo, startedAt, asOf }: Props) {
  const { alerts, threshold } = useMemo(() => {
    const p85 = repo.leadTimePace(asOf)?.p85;
    const threshold = p85 === undefined ? `${AGING_THRESHOLD_DAYS}日` : `過去の DONE の p85 (${p85}日)`;
    return { alerts: repo.alertTodos(startedAt, asOf, p85 ?? AGING_THRESHOLD_DAYS), threshold };
  }, [repo, startedAt, asOf]);

  return (
    <>
      <Text fontSize="xs" color="gray.500" mb={1}>経過日数が{threshold}を超えた TODO</Text>
      {alerts.length === 0 && <Text color="gray.500">No alerts</Text>}
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
              {t.days}d
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
