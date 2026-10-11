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
            ["WIP", "ある日の時点で未完了 (completedDate > その日 or TODO) で、その日までの14日以内に CLOCK したタスク数。期間の値は期間の最後の日の時点"],
            ["Throughput", "ある期間に DONE になったタスク数"],
            ["Queue Time", "セッション終了から同じタスクを再開するまでの間隔。60分未満は休憩とみなす"],
            ["再開待ち時間", "60分以上の Queue Time の中央値。手を離したタスクに戻るまでの時間"],
            ["集中ブロック", "同じタスクのセッションを、間隔が60分未満ならつなげたまとまり"],
            ["Interruption", "同じ日にすでに触ったタスクへ、別タスクを挟んで戻ったセッション (A→B→A の2回目の A)"],
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

      <Section title="タイムゾーン">
        <Box as="ul" pl={5} fontSize="sm" color="gray.600">
          <Box as="li">org の CLOCK / CLOSED はタイムゾーンを持たないので、パース時に JST と断定して UTC に変換し DB に保存する</Box>
          <Box as="li">表示時に閲覧者のタイムゾーンへ変換してから、日付・曜日・時間帯に振り分ける</Box>
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
          集計範囲は started_at ~ finished_at の日付範囲として定義される。
          プリセット (前週/前月/3ヶ月/半年) は started_at を過去に設定し、finished_at をデータ生成日 (UTC の generated_at を閲覧者のタイムゾーンに変換した日付) にする。
          閲覧した日ではなく生成日を基準にするので、古いデータを見ても範囲の末尾が空にならない。
        </Text>
        <Pre>{`{ started_at, finished_at } = rangeDates(range, as_of)
例: 3ヶ月 → { started_at: "2026-02-10", finished_at: "2026-05-10" }

タスクの絞り込み (Tasks ページ):
  対象条件: last_clock_out >= started_at  または  first_clock_in >= started_at

チャートのデータポイント:
  期間は暦の週 (月曜始まり) と月で区切り、何もない期間も 0 で並べる

  累積チャート (CFD, バーン, キャッシュフロー):
    - started_at からの開始・完了を累積する

  期間チャート (WIP 推移, リトルの法則, ROI):
    - WIP は期間の終わりの時点の値で、started_at 前に開始されたタスクも含む

  イベントチャート (スループット, パーセンタイル, ヒストグラム):
    - 完了日が範囲内のタスクを数える。最後の CLOCK が範囲の前でも含む`}</Pre>
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
