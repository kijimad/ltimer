import { useMemo } from "react";
import type { Task } from "../../types/index.ts";
import { shortName } from "../../hooks/usePeriodKey.ts";

interface Props {
  tasks: Task[];
}

export function AlertList({ tasks }: Props) {
  const alerts = useMemo(() => {
    return tasks
      .filter((t) => t.status === "TODO" && t.lead_time_days > 30)
      .sort((a, b) => b.lead_time_days - a.lead_time_days);
  }, [tasks]);

  return (
    <div className="card">
      <h3>Alerts</h3>
      <p className="desc">
        TODO状態かつリードタイム30日超のタスクを警告表示。長期間放置されているタスクの棚卸しに使う
      </p>
      {alerts.length === 0 ? (
        <p style={{ color: "#8b949e" }}>No alerts</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {alerts.map((t, i) => (
            <li
              key={i}
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid #21262d",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ color: "#f85149", fontWeight: "bold" }}>
                  {t.lead_time_days}d
                </span>{" "}
                <span style={{ color: "#c9d1d9" }}>{t.title}</span>
                <br />
                <small style={{ color: "#8b949e" }}>
                  {shortName(t.file)}
                </small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
