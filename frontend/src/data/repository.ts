// UI が使うデータの取得口。保存の方式 (SQLite / sql.js) には依存しない
import type { Task, TimeRange, TimeUnit, DailyWorkEntry, DraftEntry } from "../types/index.ts";
import type { Summary } from "../metrics.ts";

export interface PeriodCount {
  period: string;
  count: number;
}

export interface LeadTimePercentiles {
  data: { period: string; p50: number | null; p85: number | null; p95: number | null }[];
  globalP85: number;
}

/** 過去の DONE のリードタイムのパーセンタイル (日) */
export interface LeadTimePace {
  p50: number;
  p70: number;
  p85: number;
  p95: number;
}

export interface LeadTimeHistogram {
  /** period と、ビンのラベルごとの件数 */
  data: Record<string, string | number>[];
  bins: string[];
}

export interface WipPoint {
  period: string;
  /** 範囲内に入る日数。最初と最後の期間は短いことがある */
  days: number;
  wip: number;
  throughput: number;
  avgLead: number | null;
}

export interface FlowPoint {
  period: string;
  Started: number;
  Completed: number;
  Closed: number;
}

export interface BurnPoint {
  date: string;
  Started: number;
  Completed: number;
  WIP: number;
}

export interface CashFlowPoint {
  period: string;
  CashFlow: number;
}

export interface NetProfitPoint {
  period: string;
  Throughput: number;
  OE: number;
}

export interface FileSummaryRow {
  file: string;
  total: number;
  todo: number;
  done: number;
  close: number;
  work: number;
  avgLead: number;
  maxLead: number;
}

export interface Bucket {
  bucket: string;
  count: number;
}

export interface Estimate {
  title: string;
  effortMinutes: number;
  actualMinutes: number;
}

export interface WeekdayHourMinutes {
  /** 月曜を 0 とする */
  weekday: number;
  hour: number;
  minutes: number;
}

export interface ProjectMix {
  /** period と、プロジェクトの表示名ごとの作業時間 (分) */
  data: Record<string, string | number>[];
  /** 範囲内の作業時間が多い順。最後は「その他」になりうる */
  projects: string[];
}

export interface Streak {
  title: string;
  current: number;
  max: number;
  recentDays: number;
  rate: number;
}

/** startedAt から始まる範囲を対象にする。終点はデータの生成日 */
export interface TaskRepository {
  summary(asOf: string, range: TimeRange): Summary;
  /** 範囲内に触ったタスク。リードタイムの降順 */
  inRange(startedAt: string): Task[];
  agingTodos(startedAt: string, asOf: string): { title: string; days: number }[];
  /** asOf までの全期間の DONE から。DONE が少なく分布とみなせなければ null */
  leadTimePace(asOf: string): LeadTimePace | null;
  alertTodos(startedAt: string, asOf: string, thresholdDays: number): { title: string; file: string; days: number }[];
  fileSummary(startedAt: string): FileSummaryRow[];
  throughputByPeriod(startedAt: string, unit: TimeUnit): PeriodCount[];
  leadTimePercentiles(startedAt: string, asOf: string, unit: TimeUnit): LeadTimePercentiles;
  leadTimeHistogram(startedAt: string, unit: TimeUnit): LeadTimeHistogram;
  wipByPeriod(startedAt: string, unit: TimeUnit): WipPoint[];
  cumulativeFlow(startedAt: string, unit: TimeUnit): FlowPoint[];
  burnByDate(startedAt: string): BurnPoint[];
  cashFlowByPeriod(startedAt: string, unit: TimeUnit): CashFlowPoint[];
  netProfitByPeriod(startedAt: string, unit: TimeUnit): NetProfitPoint[];
  dailyWork(startedAt: string): DailyWorkEntry[];
  queueTimeHistogram(startedAt: string): Bucket[];
  interruptionsByPeriod(startedAt: string, unit: TimeUnit): PeriodCount[];
  focusBlockHistogram(startedAt: string): Bucket[];
  /** 範囲内に終えた DONE 1件あたりの作業時間 */
  taskSizeHistogram(startedAt: string): Bucket[];
  /** 範囲内に終えた DONE のうち、:Effort: で見積もったもの */
  estimates(startedAt: string): Estimate[];
  /** 各セッションの作業時間を開始した曜日・時間帯に数える */
  workByWeekdayHour(startedAt: string): WeekdayHourMinutes[];
  workByProject(startedAt: string, unit: TimeUnit): ProjectMix;
}

export interface ActivityRepository {
  summary(asOf: string, range: TimeRange): Summary;
  /** 並びは初めて現れた順 */
  totals(startedAt: string): { title: string; minutes: number }[];
  byPeriod(startedAt: string, unit: TimeUnit): { period: string; title: string; minutes: number }[];
  /** 各セッションの時間を開始した曜日・時間帯に数える */
  workByWeekdayHour(startedAt: string): WeekdayHourMinutes[];
  streaks(startedAt: string, asOf: string): Streak[];
}

export interface DraftRepository {
  summary(asOf: string, range: TimeRange): Summary;
  /** 範囲内に作成または公開された記事 */
  inRange(startedAt: string): DraftEntry[];
  ages(startedAt: string, asOf: string): { title: string; file: string; days: number }[];
}

export interface Repository {
  /** データを生成した時点 (UTC) */
  generatedAt(): string;
  tasks: TaskRepository;
  activities: ActivityRepository;
  drafts: DraftRepository;
}
