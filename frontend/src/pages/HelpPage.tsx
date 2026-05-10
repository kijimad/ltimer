import { Box, Heading, Text, Code } from "@chakra-ui/react";
import { Mermaid } from "../components/Mermaid.tsx";

const LEAD_TIME_GANTT = `gantt
  title Lead Time Example: "機能Aを実装する"
  dateFormat YYYY-MM-DD HH:mm
  axisFormat %m/%d

  section Work
  Session 1 (30min)   :active, s1, 2025-01-05 10:00, 30m
  Session 2 (60min)   :active, s2, 2025-01-08 14:00, 60m
  Session 3 (50min)   :active, s3, 2025-01-12 09:00, 50m

  section Wait
  Idle                :done, w1, 2025-01-05 10:30, 2025-01-08 14:00
  Idle                :done, w2, 2025-01-08 15:00, 2025-01-12 09:00

  section Lead Time
  7 days (1/5 - 1/12) :crit, lt, 2025-01-05 10:00, 2025-01-12 09:50`;

const STATUS_LIFECYCLE = `stateDiagram-v2
  [*] --> TODO : CLOCK 記録開始
  TODO --> DONE : 正常完了
  TODO --> CLOSE : 中止・破棄`;

export function HelpPage() {
  return (
    <Box p={5} maxW="4xl" mx="auto">
      <Heading size="lg" color="blue.600" mb={5}>How It Works</Heading>

      <Section title="Lead Time">
        <Text mb={3}>
          org-mode の CLOCK エントリから、タスクの最初のクロックインから最後のクロックアウトまでの経過日数をリードタイムとして計測する。
        </Text>
        <Pre>{`CLOCK: [2025-01-05 Sun 10:00]--[2025-01-05 Sun 10:30]  (30min)
CLOCK: [2025-01-08 Wed 14:00]--[2025-01-08 Wed 15:00]  (60min)
CLOCK: [2025-01-12 Sun 09:00]--[2025-01-12 Sun 09:50]  (50min)`}</Pre>
        <Box mt={4}>
          <Mermaid chart={LEAD_TIME_GANTT} />
        </Box>
        <Box mt={3} p={3} bg="blue.50" borderRadius="md" fontSize="sm" color="gray.700">
          <Text><strong>Work Time</strong> = 30 + 60 + 50 = 140min</Text>
          <Text><strong>Lead Time</strong> = 7 days (1/5 ~ 1/12)</Text>
          <Text><strong>Flow Efficiency</strong> = 140min / (7d x 24h x 60min) = 1.4%</Text>
          <Text><strong>Wait Time Ratio</strong> = 1 - 1.4% = 98.6%</Text>
        </Box>
      </Section>

      <Section title="Terminology">
        <Table
          rows={[
            ["Lead Time", "first_clock_in の日付 ~ last_clock_out の日付の日数差"],
            ["Work Time", "全 CLOCK エントリの合計時間 (分)"],
            ["Flow Efficiency", "Work Time / (Lead Time x 24h)"],
            ["Wait Time Ratio", "1 - Flow Efficiency"],
            ["WIP", "ある期間において、開始済み (first_clock_in <= 期間) かつ未完了 (completedDate > 期間 or TODO) のタスク数"],
            ["Throughput", "ある期間に DONE になったタスク数"],
          ]}
        />
      </Section>

      <Section title="Status Lifecycle">
        <Box mb={3}>
          <Mermaid chart={STATUS_LIFECYCLE} />
        </Box>
        <Pre>{`** TODO 機能Aを実装する     ... 着手中 (CLOCK を記録中)
** DONE 機能Aを実装する     ... 完了
** CLOSE 機能Aを実装する    ... 中止・破棄`}</Pre>
        <Box mt={3} fontSize="sm" color="gray.600">
          <Text><Code>completedDate</Code>: DONE/CLOSE の場合は <Code>CLOSED:</Code> タイムスタンプ、なければ <Code>last_clock_out</Code></Text>
          <Text>TODO のまま放置されたタスクは <strong>Aging WIP</strong> で検出 (30日超で警告)</Text>
        </Box>
      </Section>

      <Section title="Exclusions">
        <Box as="ul" pl={5} fontSize="sm" color="gray.600">
          <Box as="li"><Code>workflow.org</Code> のタスク (日次習慣。Activity ページで別途集計)</Box>
          <Box as="li">25分未満の CLOCK エントリ (ポモドーロ未満は除外)</Box>
        </Box>
      </Section>

      <Section title="集計範囲フィルタ">
        <Text mb={3} fontSize="sm" color="gray.600">
          ダッシュボードの集計範囲スイッチ (前週/前月/3ヶ月/半年) は以下のように作用する:
        </Text>
        <Pre>{`cutoff = rangeStartDate(range)   例: 3ヶ月なら "2025-10-10"

タスクの絞り込み (Tasks ページ):
  対象条件: last_clock_out >= cutoff  または  first_clock_in >= cutoff

チャートのデータポイント:
  累積チャート (CFD, バーン, キャッシュフロー):
    - 初期値を正しく算出するため、全期間から累積計算する
    - 表示は cutoff 以降のデータポイントのみ

  期間チャート (WIP 推移, リトルの法則, ROI):
    - cutoff 以降の期間のみ表示
    - WIP 数は cutoff 前に開始されたタスクも含む (正しい挙動)

  イベントチャート (スループット, ヒストグラム):
    - 範囲内の完了イベントのみ集計
    - cutoff 前のイベントはタスク絞り込みで自動的に除外`}</Pre>
      </Section>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box mb={8}>
      <Heading size="md" color="gray.700" mb={3} borderBottom="1px solid" borderColor="gray.200" pb={2}>
        {title}
      </Heading>
      {children}
    </Box>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <Box
      as="pre"
      bg="gray.50"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      p={4}
      fontSize="xs"
      overflowX="auto"
      whiteSpace="pre"
      fontFamily="mono"
    >
      {children}
    </Box>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <Box as="table" width="100%" fontSize="sm">
      <Box as="thead">
        <Box as="tr" borderBottom="1px solid" borderColor="gray.200">
          <Box as="th" textAlign="left" py={2} color="gray.600" width="180px">Metric</Box>
          <Box as="th" textAlign="left" py={2} color="gray.600">Definition</Box>
        </Box>
      </Box>
      <Box as="tbody">
        {rows.map(([metric, def]) => (
          <Box as="tr" key={metric} borderBottom="1px solid" borderColor="gray.100">
            <Box as="td" py={2} fontWeight="medium">{metric}</Box>
            <Box as="td" py={2} color="gray.600">{def}</Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
