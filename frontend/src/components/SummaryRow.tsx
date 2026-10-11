import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import { SUMMARY_WINDOW_DAYS, type Summary } from "../metrics.ts";
import { Gauge } from "./Gauge.tsx";

export function SummaryRow({ summary }: { summary: Summary }) {
  return (
    <Box mb={5}>
      <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} gap={3}>
        {summary.gauges.map((g) => (
          <Gauge key={g.key} metric={g} />
        ))}
        {summary.tiles.length > 0 && (
          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={3} display="flex" flexDirection="column" justifyContent="space-around">
            {summary.tiles.map((t) => (
              <Box key={t.key}>
                <Text fontSize="sm" fontWeight="bold" color="gray.700">{t.label}</Text>
                <Text fontSize="2xl" fontWeight="bold" lineHeight="1.1" color="gray.700">{t.value}</Text>
                <Text fontSize="xs" color="gray.400">{t.desc}</Text>
              </Box>
            ))}
          </Box>
        )}
      </SimpleGrid>
      <Text fontSize="xs" color="gray.400" mt={1}>
        集計: 直近{SUMMARY_WINDOW_DAYS}日 / 目盛り: 過去12週の自分の分布 (両端 p10〜p90 / 黄帯 p25〜p75)
      </Text>
    </Box>
  );
}
