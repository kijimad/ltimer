import { useMemo } from "react";
import { useWorkflowData } from "../hooks/useWorkflowData.ts";
import { useTimeRange, rangeStartDate, unitForRange } from "../hooks/useTimeRange.ts";
import { TimeRangeSwitch } from "../components/TimeRangeSwitch.tsx";
import { LeadTimeBar } from "../components/charts/LeadTimeBar.tsx";
import { ScatterChart } from "../components/charts/ScatterChart.tsx";
import { WipTrend } from "../components/charts/WipTrend.tsx";
import { ThroughputChart } from "../components/charts/ThroughputChart.tsx";
import { HistogramChart } from "../components/charts/HistogramChart.tsx";
import { FlowEfficiency } from "../components/charts/FlowEfficiency.tsx";
import { AgingWip } from "../components/charts/AgingWip.tsx";
import { CfdChart } from "../components/charts/CfdChart.tsx";
import { GanttChart } from "../components/charts/GanttChart.tsx";
import { BurnChart } from "../components/charts/BurnChart.tsx";
import { DailyWork } from "../components/charts/DailyWork.tsx";
import { NetProfitTrend } from "../components/charts/NetProfitTrend.tsx";
import { RoiChart } from "../components/charts/RoiChart.tsx";
import { CashFlowChart } from "../components/charts/CashFlowChart.tsx";
import { AlertList } from "../components/charts/AlertList.tsx";
import { FileTable } from "../components/charts/FileTable.tsx";
import { TaskTable } from "../components/charts/TaskTable.tsx";

export function TasksPage() {
  const { data, error } = useWorkflowData();
  const { range, setRange } = useTimeRange();

  const unit = unitForRange(range);

  const filtered = useMemo(() => {
    if (!data) return null;
    const cutoff = rangeStartDate(range).toISOString();
    const tasks = data.tasks.filter(
      (t) => t.last_clock_out >= cutoff || t.first_clock_in >= cutoff
    );
    const dailyWork = data.daily_work.filter((d) => d.date >= cutoff.slice(0, 10));
    return { tasks, dailyWork };
  }, [data, range]);

  if (error) return <div className="page">Error: {error}</div>;
  if (!data || !filtered) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <h1>Lead Time Dashboard</h1>
      <p className="meta">
        Generated: {data.generated_at.slice(0, 16)} | Cutoff: {data.cutoff_date}
      </p>
      <TimeRangeSwitch range={range} onChange={setRange} />
      <div className="grid">
        <LeadTimeBar tasks={filtered.tasks} />
        <ScatterChart tasks={filtered.tasks} />
        <WipTrend tasks={filtered.tasks} unit={unit} />
        <ThroughputChart tasks={filtered.tasks} unit={unit} />
        <HistogramChart tasks={filtered.tasks} />
        <FlowEfficiency tasks={filtered.tasks} />
        <AgingWip tasks={filtered.tasks} />
        <CfdChart tasks={filtered.tasks} unit={unit} />
        <GanttChart tasks={filtered.tasks} />
        <BurnChart tasks={filtered.tasks} />
        <DailyWork dailyWork={filtered.dailyWork} />
        <NetProfitTrend tasks={filtered.tasks} dailyWork={filtered.dailyWork} unit={unit} />
        <RoiChart tasks={filtered.tasks} unit={unit} />
        <CashFlowChart tasks={filtered.tasks} unit={unit} />
        <AlertList tasks={filtered.tasks} />
        <FileTable tasks={filtered.tasks} />
        <TaskTable tasks={filtered.tasks} />
      </div>
    </div>
  );
}
