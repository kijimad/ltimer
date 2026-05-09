import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { Task } from "../../types/index.ts";
import { STATUS_COLORS } from "./colors.ts";

interface Props {
  tasks: Task[];
}

const EPOCH = new Date("2000-01-01").getTime();
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toDayNum(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - EPOCH) / MS_PER_DAY);
}

function fromDayNum(day: number): string {
  return new Date(EPOCH + day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function GanttChart({ tasks }: Props) {
  const { data, minDay, maxDay } = useMemo(() => {
    const sorted = [...tasks].sort(
      (a, b) => new Date(a.first_clock_in).getTime() - new Date(b.first_clock_in).getTime()
    );
    const items = sorted.map((t) => {
      const start = toDayNum(t.first_clock_in);
      const end = Math.max(toDayNum(t.last_clock_out), start + 1);
      return {
        title: t.title.slice(0, 25),
        range: [start, end] as [number, number],
        status: t.status,
        fill: STATUS_COLORS[t.status],
        startDate: fromDayNum(start),
        endDate: fromDayNum(end),
        duration: end - start,
      };
    });
    const allDays = items.flatMap((d) => d.range);
    return {
      data: items,
      minDay: allDays.length > 0 ? Math.min(...allDays) - 1 : 0,
      maxDay: allDays.length > 0 ? Math.max(...allDays) + 1 : 1,
    };
  }, [tasks]);

  return (
    <div className="card full">
      <h2>Gantt Chart</h2>
      <p className="desc">
        タスクごとの開始日〜終了日を横棒で表示。開始日順にソート。橙=TODO, 緑=DONE, 紫=CLOSE
      </p>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            type="number"
            stroke="#8b949e"
            domain={[minDay, maxDay]}
            tickFormatter={(v: number) => fromDayNum(v)}
          />
          <YAxis type="category" dataKey="title" stroke="#8b949e" width={110} tick={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div style={{ background: "#161b22", border: "1px solid #30363d", padding: 8, fontSize: 12 }}>
                  <div>{d.title}</div>
                  <div>
                    {d.startDate} → {d.endDate} ({d.duration}d)
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="range" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
