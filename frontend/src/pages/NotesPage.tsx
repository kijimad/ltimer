import { useMemo } from "react";
import { Box, Heading, SimpleGrid } from "@chakra-ui/react";
import { useTimeRange, rangeDates, unitForRange } from "../hooks/useTimeRange.ts";
import { NavTimeRangeSwitch } from "../components/TimeRangeSwitch.tsx";
import { ChartCard } from "../components/ChartCard.tsx";
import { NoteStatusChart } from "../components/charts/NoteStatusChart.tsx";
import { NoteTagChart } from "../components/charts/NoteTagChart.tsx";
import { NoteLeadTimeChart } from "../components/charts/NoteLeadTimeChart.tsx";
import { NoteTable } from "../components/charts/NoteTable.tsx";
import { SummaryRow } from "../components/SummaryRow.tsx";
import { FooterGeneratedAt } from "../components/GeneratedAt.tsx";
import { useMountTime } from "../hooks/useMountTime.ts";
import { asOfDate } from "../dates.ts";
import { useRepository } from "../hooks/useRepository.ts";

export function NotesPage() {
  const { repo, error } = useRepository();
  const { range } = useTimeRange();
  const now = useMountTime();
  const unit = unitForRange(range);

  const generated = useMemo(() => (repo ? repo.generatedAt() : null), [repo]);
  const asOf = generated ? asOfDate(generated) : null;
  const dates = useMemo(() => (asOf ? rangeDates(range, asOf) : null), [range, asOf]);
  const summary = useMemo(() => (repo && asOf ? repo.notes.summary(asOf, range) : null), [repo, asOf, range]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!repo || !generated || !asOf || !dates || !summary) return <Box p={5}>Loading...</Box>;

  const { startedAt, finishedAt } = dates;

  return (
    <Box p={5}>
      <Heading size="lg" color="blue.600" mb={5}>Notes Dashboard</Heading>
      <FooterGeneratedAt generatedAt={generated} now={now} />
      <SummaryRow summary={summary} />
      <NavTimeRangeSwitch startedAt={startedAt} finishedAt={finishedAt} />
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
        <ChartCard title="Notes by Status" desc="期間ごとに作成したメモの数 (ファイル名のタイムスタンプで数える) を、今の公開状態で積み上げる。draft は今 draft タグが付いたメモ、published はそれ以外">
          <NoteStatusChart repo={repo.notes} startedAt={startedAt} unit={unit} />
        </ChartCard>
        <ChartCard title="Notes by Tag" desc="期間ごとに作成したメモの数を、ファイル名の最初のタグで積み上げる。draft タグは公開状態なので数えない">
          <NoteTagChart repo={repo.notes} startedAt={startedAt} unit={unit} />
        </ChartCard>
        <ChartCard title="Days to Publish" desc="範囲内に作成または公開したメモと今の下書きのうち、下書きを経たもの。公開済みは作成から draft タグを外すまでの日数、下書きは作成からの経過日数を長い順に並べる。緑=公開済み、橙=下書き">
          <NoteLeadTimeChart repo={repo.notes} startedAt={startedAt} asOf={asOf} />
        </ChartCard>
        <ChartCard title="Notes" desc="範囲内に作成または公開したメモと、範囲によらず今の下書き。ヘッダのクリックで並べ替える">
          <NoteTable repo={repo.notes} startedAt={startedAt} />
        </ChartCard>
      </SimpleGrid>
    </Box>
  );
}
