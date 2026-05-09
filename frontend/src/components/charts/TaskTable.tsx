import { useMemo, useState } from "react";
import type { Task } from "../../types/index.ts";
import { shortName } from "../../hooks/usePeriodKey.ts";

interface Props {
  tasks: Task[];
}

type SortKey =
  | "title"
  | "file"
  | "status"
  | "lead_time_days"
  | "total_minutes"
  | "clock_count"
  | "first_clock_in"
  | "last_clock_out";

export function TaskTable({ tasks }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("lead_time_days");
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string")
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      return asc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [tasks, sortKey, asc]);

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
      <h3>Task Details</h3>
      <p className="desc">
        全タスクの詳細一覧。タスク名、ファイル、ステータス、リードタイム、作業時間、セッション数。ヘッダクリックでソート
      </p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {th("Task", "title")}
              {th("File", "file")}
              {th("Status", "status")}
              {th("Lead Time(d)", "lead_time_days")}
              {th("Work(min)", "total_minutes")}
              {th("Sessions", "clock_count")}
              {th("Start", "first_clock_in")}
              {th("Last", "last_clock_out")}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <tr key={i}>
                <td>{t.title}</td>
                <td>{shortName(t.file)}</td>
                <td>
                  <span className={`status-${t.status.toLowerCase()}`}>
                    {t.status}
                  </span>
                </td>
                <td>{t.lead_time_days}</td>
                <td>{t.total_minutes}</td>
                <td>{t.clock_count}</td>
                <td>{t.first_clock_in.slice(0, 10)}</td>
                <td>{t.last_clock_out.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
