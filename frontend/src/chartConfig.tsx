import type { ReactNode } from "react";
import type { Task, DailyWorkEntry, TimeUnit } from "./types/index.ts";
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
import { AlertList } from "./components/charts/AlertList.tsx";
import { FileTable } from "./components/charts/FileTable.tsx";
import { TaskTable } from "./components/charts/TaskTable.tsx";

export interface ChartProps {
  tasks: Task[];
  dailyWork: DailyWorkEntry[];
  unit: TimeUnit;
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
        desc: "完了タスクのリードタイム分布(ヒストグラム)。中央値や外れ値が一目でわかる",
        render: ({ tasks }) => <HistogramChart tasks={tasks} />,
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
        desc: "期間ごとの仕掛かり(WIP)数の推移。WIPが増え続けていれば着手過多でボトルネックの兆候",
        render: ({ tasks, unit }) => <WipTrend tasks={tasks} unit={unit} />,
      },
      {
        key: "throughput",
        title: "Throughput",
        desc: "期間ごとのDONE完了数。改善が進んでいるか、スループットが安定しているかを確認する",
        render: ({ tasks, unit }) => <ThroughputChart tasks={tasks} unit={unit} />,
      },
      {
        key: "cfd",
        title: "Cumulative Flow Diagram",
        desc: "期間ごとのStarted/Completed/Closedの累積数を積み上げ面グラフで表示。バンド(帯)の幅がWIP量を示し、広がっていれば仕掛かりが増加している",
        render: ({ tasks, unit }) => <CfdChart tasks={tasks} unit={unit} />,
      },
      {
        key: "burn",
        title: "Burn Chart",
        desc: "日ごとの累積Started/Completed数とWIP数を表示。Started-Completedの差がWIP。二つの線が離れるほど仕掛かりが溜まっている",
        render: ({ tasks }) => <BurnChart tasks={tasks} />,
      },
      {
        key: "aging-wip",
        title: "Aging WIP",
        desc: "現在TODOのタスクが最初のクロックインから何日経過しているか。30日超は赤色で警告",
        render: ({ tasks }) => <AgingWip tasks={tasks} />,
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
        desc: "タスクごとの開始日〜終了日を横棒で表示。開始日順にソート。橙=TODO, 緑=DONE, 紫=CLOSE",
        render: ({ tasks }) => <GanttChart tasks={tasks} />,
      },
      {
        key: "daily-work",
        title: "Daily Work",
        desc: "日ごとにどのタスクに何分投入したかをスタック棒グラフで表示。作業配分のばらつきやマルチタスクの度合いを確認できる",
        render: ({ dailyWork }) => <DailyWork dailyWork={dailyWork} />,
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
        render: ({ tasks, dailyWork, unit }) => (
          <NetProfitTrend tasks={tasks} dailyWork={dailyWork} unit={unit} />
        ),
      },
      {
        key: "roi",
        title: "ROI (T / I)",
        desc: "投資収益率 = スループット(T) / 在庫(I)。期間あたり完了数÷WIP数。高いほど仕掛かり在庫が効率的にスループットへ変換されている",
        render: ({ tasks, unit }) => <RoiChart tasks={tasks} unit={unit} />,
      },
      {
        key: "cash-flow",
        title: "Cash Flow",
        desc: "期間ごとの(完了数 - 新規着手数)を累積表示。右肩上がりなら在庫が減りスループットが勝っている健全な状態",
        render: ({ tasks, unit }) => <CashFlowChart tasks={tasks} unit={unit} />,
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
        render: ({ tasks }) => <AlertList tasks={tasks} />,
      },
      {
        key: "file-table",
        title: "File Summary",
        desc: "ファイルごとのタスク数、TODO/DONE/CLOSE内訳、合計作業時間、平均・最大リードタイム",
        render: ({ tasks }) => <FileTable tasks={tasks} />,
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
