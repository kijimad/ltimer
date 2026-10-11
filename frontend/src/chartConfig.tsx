import type { ReactNode } from "react";
import type { TaskRepository } from "./data/repository.ts";
import type { Task, TimeUnit } from "./types/index.ts";
import { LeadTimeBar } from "./components/charts/LeadTimeBar.tsx";
import { ScatterChart } from "./components/charts/ScatterChart.tsx";
import { WipTrend } from "./components/charts/WipTrend.tsx";
import { ThroughputChart } from "./components/charts/ThroughputChart.tsx";
import { HistogramChart } from "./components/charts/HistogramChart.tsx";
import { FlowEfficiency } from "./components/charts/FlowEfficiency.tsx";
import { AgingWip } from "./components/charts/AgingWip.tsx";
import { CfdChart } from "./components/charts/CfdChart.tsx";
import { GanttChart } from "./components/charts/GanttChart.tsx";
import { BurnChart } from "./components/charts/BurnChart.tsx";
import { DailyWork } from "./components/charts/DailyWork.tsx";
import { NetProfitTrend } from "./components/charts/NetProfitTrend.tsx";
import { RoiChart } from "./components/charts/RoiChart.tsx";
import { CashFlowChart } from "./components/charts/CashFlowChart.tsx";
import { PercentileChart } from "./components/charts/PercentileChart.tsx";
import { BatchSizeChart } from "./components/charts/BatchSizeChart.tsx";
import { LittlesLaw } from "./components/charts/LittlesLaw.tsx";
import { WaitTimeRatio } from "./components/charts/WaitTimeRatio.tsx";
import { BottleneckChart } from "./components/charts/BottleneckChart.tsx";
import { AlertList } from "./components/charts/AlertList.tsx";
import { FileTable } from "./components/charts/FileTable.tsx";
import { TaskTable } from "./components/charts/TaskTable.tsx";
import { QueueTimeChart } from "./components/charts/QueueTimeChart.tsx";
import { FocusBlockChart } from "./components/charts/FocusBlockChart.tsx";
import { TimeOfDayChart } from "./components/charts/TimeOfDayChart.tsx";
import { ProjectMixChart } from "./components/charts/ProjectMixChart.tsx";
import { InterruptionChart } from "./components/charts/InterruptionChart.tsx";

export interface ChartProps {
  repo: TaskRepository;
  /** 範囲内に触ったタスク。1タスク1行で描くチャートが使う */
  tasks: Task[];
  unit: TimeUnit;
  startedAt: string;
  /** データの基準日。generated_at の閲覧者タイムゾーンでの日付 */
  asOf: string;
}

interface ChartEntry {
  key: string;
  title: string;
  desc: string;
  full?: boolean;
  render: (props: ChartProps) => ReactNode;
}

export interface ChartGroup {
  key: string;
  label: string;
  charts: ChartEntry[];
}

export const CHART_GROUPS: ChartGroup[] = [
  {
    key: "lead-time",
    label: "リードタイム",
    charts: [
      {
        key: "lead-time-bar",
        title: "Lead Time by Task (days)",
        desc: "タスクごとのリードタイム(最初のクロックイン〜最後のクロックアウトの日数)を降順表示。長いものがボトルネック候補。橙=TODO, 緑=DONE, 紫=CLOSE",
        render: ({ tasks }) => <LeadTimeBar tasks={tasks} />,
      },
      {
        key: "scatter",
        title: "Lead Time vs Work Time",
        desc: "横軸がリードタイム(日)、縦軸が実作業時間(分)。右下に位置するタスクは「長期間かかっているが実作業が少ない」=滞留している",
        render: ({ tasks }) => <ScatterChart tasks={tasks} />,
      },
      {
        key: "histogram",
        title: "Lead Time Distribution",
        desc: "完了タスクのリードタイム分布を期間ごとにスライスして比較。期間間の分布シフトや改善傾向が一目でわかる",
        render: ({ repo, startedAt, unit }) => <HistogramChart repo={repo} startedAt={startedAt} unit={unit} />,
      },
      {
        key: "percentile",
        title: "Lead Time Percentile (SLE)",
        desc: "期間ごとの完了タスクのリードタイム50th/85th/95thパーセンタイル推移。85thパーセンタイルがサービスレベル期待値(SLE)となり、予測可能性の指標になる",
        render: ({ repo, startedAt, asOf, unit }) => <PercentileChart repo={repo} startedAt={startedAt} asOf={asOf} unit={unit} />,
      },
      {
        key: "batch-size",
        title: "Batch Size Analysis",
        desc: "横軸がセッション数(clock_count)、縦軸がリードタイム。セッション数が多い=バッチが大きいタスクほどリードタイムが長い傾向があるか確認する",
        render: ({ tasks }) => <BatchSizeChart tasks={tasks} />,
      },
    ],
  },
  {
    key: "flow",
    label: "フロー",
    charts: [
      {
        key: "flow-efficiency",
        title: "Flow Efficiency",
        desc: "各タスクの実作業時間÷リードタイムを%で表示。低いほど待ち時間が多く、作業が滞留している",
        render: ({ tasks }) => <FlowEfficiency tasks={tasks} />,
      },
      {
        key: "wip-trend",
        title: "WIP Trend",
        desc: "各期間の終わりのアクティブ WIP (未完了で14日以内に CLOCK したタスク) の推移。WIPが増え続けていれば着手過多でボトルネックの兆候",
        render: ({ repo, startedAt, unit }) => <WipTrend repo={repo} startedAt={startedAt} unit={unit} />,
      },
      {
        key: "throughput",
        title: "Throughput",
        desc: "期間ごとのDONE完了数。改善が進んでいるか、スループットが安定しているかを確認する",
        render: ({ repo, startedAt, unit }) => <ThroughputChart repo={repo} startedAt={startedAt} unit={unit} />,
      },
      {
        key: "cfd",
        title: "Cumulative Flow Diagram",
        desc: "範囲の始まりからのStarted/Completed/Closedの累積数を面グラフで表示。StartedとCompletedの差が範囲内で増えた仕掛かりで、広がっていれば着手が完了を上回っている",
        render: ({ repo, startedAt, unit }) => <CfdChart repo={repo} startedAt={startedAt} unit={unit} />,
      },
      {
        key: "burn",
        title: "Burn Chart",
        desc: "範囲の始まりからの日ごとの累積Started/Completed数と、その日のアクティブ WIP を表示。二つの線が離れるほど着手が完了を上回っている",
        render: ({ repo, startedAt }) => <BurnChart repo={repo} startedAt={startedAt} />,
      },
      {
        key: "aging-wip",
        title: "Aging WIP",
        desc: "現在TODOのタスクが最初のクロックインから何日経過しているか。30日超は赤色で警告",
        render: ({ repo, startedAt, asOf }) => <AgingWip repo={repo} startedAt={startedAt} asOf={asOf} />,
      },
      {
        key: "littles-law",
        title: "Little's Law Validation",
        desc: "リトルの法則(LT = WIP / 1日あたりのThroughput)による予測リードタイムと実績リードタイムを比較。乖離が大きい期間はフローが不安定",
        render: ({ repo, startedAt, unit }) => <LittlesLaw repo={repo} startedAt={startedAt} unit={unit} />,
      },
      {
        key: "wait-time",
        title: "Wait Time Ratio",
        desc: "各タスクの待ち時間割合(1 - 実作業時間/リードタイム)。90%超は赤、70%超は橙。待ち時間が多いタスクほどフロー改善の余地がある",
        render: ({ tasks }) => <WaitTimeRatio tasks={tasks} />,
      },
      {
        key: "queue-time",
        title: "Queue Time Distribution",
        desc: "セッションが終わってから同じタスクを再開するまでの間隔の分布。1時間未満は休憩として灰色。長い間隔が多いほど手を離したタスクが滞留している",
        render: ({ repo, startedAt }) => <QueueTimeChart repo={repo} startedAt={startedAt} />,
      },
      {
        key: "focus-blocks",
        title: "Focus Blocks",
        desc: "同じタスクを60分未満の間隔で続けたまとまり (集中ブロック) の長さの分布。長いブロックが多いほどまとまった作業ができている",
        render: ({ repo, startedAt }) => <FocusBlockChart repo={repo} startedAt={startedAt} />,
      },
    ],
  },
  {
    key: "timeline",
    label: "タイムライン",
    charts: [
      {
        key: "gantt",
        title: "Gantt Chart",
        desc: "タスクごとのセッションを時間軸に並べる。濃い区間が作業していたセッション、薄い帯が着手〜最終作業の期間で、薄い帯だけの区間が待ち時間。開始日順。橙=TODO, 緑=DONE, 紫=CLOSE",
        render: ({ tasks, startedAt, asOf }) => <GanttChart tasks={tasks} startedAt={startedAt} asOf={asOf} />,
      },
      {
        key: "daily-work",
        title: "Daily Work",
        desc: "日ごとにどのタスクに何分投入したかをスタック棒グラフで表示。作業配分のばらつきやマルチタスクの度合いを確認できる",
        render: ({ repo, startedAt }) => <DailyWork repo={repo} startedAt={startedAt} />,
      },
      {
        key: "time-of-day",
        title: "Time of Day",
        desc: "時間帯ごとの1日あたり平均作業時間を曜日ごとに比べる。各セッションを開始した時間帯に数え、合計を範囲内のその曜日の日数で割る",
        render: ({ repo, startedAt, asOf }) => <TimeOfDayChart repo={repo} startedAt={startedAt} asOf={asOf} />,
      },
      {
        key: "project-mix",
        title: "Project Mix",
        desc: "期間ごとの、ファイル (プロジェクト) 別の作業時間。範囲内で作業時間の多い上位7件と、残りを「その他」にまとめて積み上げる",
        render: ({ repo, startedAt, unit }) => <ProjectMixChart repo={repo} startedAt={startedAt} unit={unit} />,
      },
      {
        key: "interruptions",
        title: "Interruptions",
        desc: "同じ日に別のタスクを挟んで元のタスクに戻った回数 (A→B→A の2回目の A を1回)。多いほど作業が分断されている",
        render: ({ repo, startedAt, unit }) => <InterruptionChart repo={repo} startedAt={startedAt} unit={unit} />,
      },
    ],
  },
  {
    key: "toc",
    label: "TOC (制約理論)",
    charts: [
      {
        key: "net-profit",
        title: "Net Profit (T − OE)",
        desc: "純利益 = スループット(T) - 業務費用(OE)。緑棒が期間あたり完了タスク数(T)、赤線が投入作業時間(OE)。Tが増えつつOEが減るのが理想",
        render: ({ repo, startedAt, unit }) => <NetProfitTrend repo={repo} startedAt={startedAt} unit={unit} />,
      },
      {
        key: "roi",
        title: "ROI (T / I)",
        desc: "投資収益率 = スループット(T) / 在庫(I)。期間あたり完了数÷期間の終わりのアクティブ WIP 数。高いほど仕掛かり在庫が効率的にスループットへ変換されている",
        render: ({ repo, startedAt, unit }) => <RoiChart repo={repo} startedAt={startedAt} unit={unit} />,
      },
      {
        key: "cash-flow",
        title: "Cash Flow",
        desc: "範囲の始まりからの(完了数 - 新規着手数)を累積表示。右肩上がりなら在庫が減りスループットが勝っている健全な状態",
        render: ({ repo, startedAt, unit }) => <CashFlowChart repo={repo} startedAt={startedAt} unit={unit} />,
      },
      {
        key: "bottleneck",
        title: "Bottleneck Analysis",
        desc: "タスク単位のセッション数 vs リードタイム。バブルサイズは待ち時間割合。右上の大きなバブルほど多セッション・長期間・待ち時間大でボトルネック候補",
        render: ({ tasks }) => <BottleneckChart tasks={tasks} />,
      },
    ],
  },
  {
    key: "tables",
    label: "一覧",
    charts: [
      {
        key: "alerts",
        title: "Alerts",
        desc: "TODO状態かつリードタイム30日超のタスクを警告表示。長期間放置されているタスクの棚卸しに使う",
        full: false,
        render: ({ repo, startedAt }) => <AlertList repo={repo} startedAt={startedAt} />,
      },
      {
        key: "file-table",
        title: "File Summary",
        desc: "ファイルごとのタスク数、TODO/DONE/CLOSE内訳、合計作業時間、平均・最大リードタイム",
        render: ({ repo, startedAt }) => <FileTable repo={repo} startedAt={startedAt} />,
      },
      {
        key: "task-table",
        title: "Task Details",
        desc: "全タスクの詳細一覧。タスク名、ファイル、ステータス、リードタイム、作業時間、セッション数",
        render: ({ tasks }) => <TaskTable tasks={tasks} />,
      },
    ],
  },
];
