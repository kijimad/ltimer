import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import { HISTORY_PERIODS, type Summary } from "../metrics.ts";
import { Gauge } from "./Gauge.tsx";

export function SummaryRow({ summary }: { summary: Summary }) {
  return (
    <Box mb={5}>
      <SimpleGrid minChildWidth="170px" gap={3}>
        {summary.gauges.map((g) => (
          <Gauge key={g.key} metric={g} />
        ))}
        {summary.tiles.length > 0 && (
          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={3} display="flex" flexDirection="column" justifyContent="space-around">
            {summary.tiles.map((t) => (
              <Box key={t.key}>
                <Text fontSize="sm" fontWeight="bold" color="gray.700">{t.label}</Text>
                <Text fontSize="2xl" fontWeight="bold" lineHeight="1.1" color={t.alert ? "red.500" : "gray.700"}>
                  {t.value}
                  {t.unit && <Text as="span" fontSize="sm" color="gray.500" ml={1}>{t.unit}</Text>}
                </Text>
                <Text fontSize="xs" color="gray.400">{t.desc}</Text>
              </Box>
            ))}
          </Box>
        )}
      </SimpleGrid>
      <Text fontSize="xs" color="gray.400" mt={1}>
        ゲージは右へ振れるほど良い / 集計: 選択中の範囲 / 目盛り: 同じ長さの過去の期間 (最大{HISTORY_PERIODS}) の分布 (両端 p10〜p90 / 黄帯 p25〜p75)
      </Text>
    </Box>
  );
}
