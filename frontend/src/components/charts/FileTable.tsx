import { useMemo, useState } from "react";
import type { Task } from "../../types/index.ts";
import { shortName } from "../../hooks/usePeriodKey.ts";

interface Props {
  tasks: Task[];
}

interface FileRow {
  file: string;
  display: string;
  total: number;
  todo: number;
  done: number;
  close: number;
  work: number;
  avgLead: number;
  maxLead: number;
}

type SortKey = keyof FileRow;

export function FileTable({ tasks }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const byFile: Record<string, Task[]> = {};
    for (const t of tasks) {
      (byFile[t.file] ??= []).push(t);
    }

    return Object.entries(byFile).map(([file, ts]): FileRow => {
      const leads = ts.map((t) => t.lead_time_days);
      return {
        file,
        display: shortName(file),
        total: ts.length,
        todo: ts.filter((t) => t.status === "TODO").length,
        done: ts.filter((t) => t.status === "DONE").length,
        close: ts.filter((t) => t.status === "CLOSE").length,
        work: ts.reduce((s, t) => s + t.total_minutes, 0),
        avgLead: Math.round((leads.reduce((s, v) => s + v, 0) / leads.length) * 10) / 10,
        maxLead: Math.max(...leads),
      };
    });
  }, [tasks]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      return asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [rows, sortKey, asc]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  const th = (label: string, key: SortKey) => (
    <th
      style={{ cursor: "pointer", userSelect: "none" }}
      onClick={() => handleSort(key)}
    >
      {label}
      {sortKey === key ? (asc ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div className="card full">
      <h3>File Summary</h3>
      <p className="desc">
        ファイルごとのタスク数、TODO/DONE/CLOSE内訳、合計作業時間、平均・最大リードタイム。ヘッダクリックでソート
      </p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {th("File", "display")}
              {th("Tasks", "total")}
              {th("TODO", "todo")}
              {th("DONE", "done")}
              {th("CLOSE", "close")}
              {th("Work(min)", "work")}
              {th("Avg Lead(d)", "avgLead")}
              {th("Max Lead(d)", "maxLead")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.file}>
                <td>{r.display}</td>
                <td>{r.total}</td>
                <td>{r.todo}</td>
                <td>{r.done}</td>
                <td>{r.close}</td>
                <td>{r.work}</td>
                <td>{r.avgLead}</td>
                <td>{r.maxLead}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
