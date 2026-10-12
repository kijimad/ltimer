import type { Database } from "sql.js";
import type { Repository } from "../data/repository.ts";
import { generatedAt } from "./queries.ts";
import { taskSummary, draftSummary, activitySummary } from "./summary.ts";
import * as c from "./charts.ts";

export function createSqlRepository(db: Database): Repository {
  return {
    generatedAt: () => generatedAt(db),
    tasks: {
      summary: (asOf, range) => taskSummary(db, asOf, range),
      inRange: (s) => c.tasksInRange(db, s),
      agingTodos: (s, asOf) => c.agingTodos(db, s, asOf),
      leadTimePace: (asOf) => c.leadTimePace(db, asOf),
      alertTodos: (s, asOf, days) => c.alertTodos(db, s, asOf, days),
      fileSummary: (s) => c.fileSummary(db, s),
      throughputByPeriod: (s, u) => c.throughputByPeriod(db, s, u),
      leadTimePercentiles: (s, asOf, u) => c.leadTimePercentiles(db, s, asOf, u),
      leadTimeHistogram: (s, u) => c.leadTimeHistogram(db, s, u),
      wipByPeriod: (s, u) => c.wipByPeriod(db, s, u),
      cumulativeFlow: (s, u) => c.cumulativeFlow(db, s, u),
      burnByDate: (s) => c.burnByDate(db, s),
      cashFlowByPeriod: (s, u) => c.cashFlowByPeriod(db, s, u),
      netProfitByPeriod: (s, u) => c.netProfitByPeriod(db, s, u),
      dailyWork: (s) => c.dailyWorkInRange(db, s),
      queueTimeHistogram: (s) => c.queueTimeHistogram(db, s),
      interruptionsByPeriod: (s, u) => c.interruptionsByPeriod(db, s, u),
      focusBlockHistogram: (s) => c.focusBlockHistogram(db, s),
      taskSizeHistogram: (s) => c.taskSizeHistogram(db, s),
      estimates: (s) => c.estimates(db, s),
      workByWeekdayHour: (s) => c.workByWeekdayHour(db, s),
      workByProject: (s, u) => c.workByProject(db, s, u),
    },
    activities: {
      summary: (asOf, range) => activitySummary(db, asOf, range),
      totals: (s) => c.activityTotals(db, s),
      byPeriod: (s, u) => c.activityByPeriod(db, s, u),
      workByWeekdayHour: (s) => c.activityByWeekdayHour(db, s),
      streaks: (s, asOf) => c.activityStreaks(db, s, asOf),
    },
    drafts: {
      summary: (asOf, range) => draftSummary(db, asOf, range),
      inRange: (s) => c.draftsInRange(db, s),
      ages: (s, asOf) => c.draftAges(db, s, asOf),
    },
  };
}
