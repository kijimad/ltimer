import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import { HISTORY_PERIODS, type GaugeMetric, type Summary } from "../metrics.ts";
import { Gauge } from "./Gauge.tsx";

/** 今の期間にも過去にも値がない指標 (DEADLINE を使っていない、など) は測れないので出さない。見出しは出てきた順に並べる */
function groupGauges(gauges: GaugeMetric[]): { group: string | undefined; gauges: GaugeMetric[] }[] {
  const groups: { group: string | undefined; gauges: GaugeMetric[] }[] = [];
  for (const g of gauges.filter((g) => g.value !== null || g.history.length > 0)) {
    const last = groups.at(-1);
    if (last && last.group === g.group) last.gauges.push(g);
    else groups.push({ group: g.group, gauges: [g] });
  }
  return groups;
}

export function SummaryRow({ summary }: { summary: Summary }) {
  return (
    <Box mb={5}>
      {groupGauges(summary.gauges).map(({ group, gauges }) => (
        <Box key={group ?? ""} mb={3}>
          {group && <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1}>{group}</Text>}
          {/* auto-fill で空の列も残し、ゲージの少ない見出しでも幅をほかの見出しとそろえる */}
          <Grid templateColumns="repeat(auto-fill, minmax(170px, 1fr))" gap={3}>
            {gauges.map((g) => (
              <Gauge key={g.key} metric={g} />
            ))}
          </Grid>
        </Box>
      ))}
      {/* ゲージの数で折り返しが変わっても、タイルが1つだけ次の行に回らないよう別の行に並べる */}
      {summary.tiles.length > 0 && (
        <Flex gap={3} mt={3} wrap="wrap">
          {summary.tiles.map((t) => (
            <Box key={t.key} bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" px={3} py={2} minW="200px">
              <Text fontSize="sm" fontWeight="bold" color="gray.700">{t.label}</Text>
              <Text fontSize="2xl" fontWeight="bold" lineHeight="1.1" color={t.alert ? "red.500" : "gray.700"}>
                {t.value}
                {t.unit && <Text as="span" fontSize="sm" color="gray.500" ml={1}>{t.unit}</Text>}
              </Text>
              <Text fontSize="xs" color="gray.400">{t.desc}</Text>
            </Box>
          ))}
        </Flex>
      )}
      <Text fontSize="xs" color="gray.400" mt={1}>
        ゲージは右へ振れるほど良い / 集計: 選択中の範囲 / 目盛り: 同じ長さの過去の期間 (最大{HISTORY_PERIODS}) の分布 (両端 p10〜p90 / 黄帯 p25〜p75)
      </Text>
    </Box>
  );
}
