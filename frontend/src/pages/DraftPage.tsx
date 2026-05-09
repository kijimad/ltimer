import { useDraftData } from "../hooks/useDraftData.ts";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart as RechartsScatter, Scatter, CartesianGrid,
} from "recharts";

export function DraftPage() {
  const { data, error } = useDraftData();
  const [sortKey, setSortKey] = useState<string>("lead_time_days");
  const [sortDir, setSortDir] = useState(-1);

  const handleSort = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => d * -1);
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.entries].sort((a, b) => {
      const va = a[sortKey as keyof typeof a];
      const vb = b[sortKey as keyof typeof b];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * sortDir;
      return String(va).localeCompare(String(vb)) * sortDir;
    });
  }, [data, sortKey, sortDir]);

  if (error) return <div className="page">Error: {error}</div>;
  if (!data) return <div className="page">Loading...</div>;

  const published = data.entries.filter((e) => e.status === "published" && e.lead_time_days != null);
  const drafts = data.entries.filter((e) => e.status === "draft");

  const barData = [...published]
    .sort((a, b) => (b.lead_time_days ?? 0) - (a.lead_time_days ?? 0))
    .map((e) => ({
      name: e.title.slice(0, 30),
      days: e.lead_time_days,
    }));

  const scatterData = data.entries.map((e) => ({
    title: e.title,
    leadTime: e.lead_time_days ?? 0,
    status: e.status,
  }));

  const draftAging = drafts.map((e) => {
    const days = Math.floor((Date.now() - new Date(e.created).getTime()) / (1000 * 60 * 60 * 24));
    return { name: e.title.slice(0, 30), days, file: e.file };
  }).sort((a, b) => b.days - a.days);

  return (
    <div className="page">
      <h1>Draft Lead Time</h1>
      <p className="meta">Generated: {data.generated_at.slice(0, 16)}</p>

      <div className="grid">
        {barData.length > 0 && (
          <div className="card full">
            <h2>公開済みリードタイム (days)</h2>
            <p className="desc">
              draftタグ付与から公開(draftタグ除去)までの日数を降順表示。下書き期間が長いほど公開に至るまでの障壁が大きい
            </p>
            <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 28)}>
              <BarChart data={barData} layout="vertical" margin={{ left: 120 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
                <Bar dataKey="days" fill="#3fb950" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {scatterData.length > 0 && (
          <div className="card">
            <h2>Draft vs Published</h2>
            <p className="desc">
              公開済みと下書き中のリードタイム分布。下書き中のものが長期化していないか確認する
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsScatter margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis type="number" dataKey="leadTime" name="Lead Time" unit="d" />
                <YAxis type="category" dataKey="status" />
                <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
                <Scatter
                  data={scatterData.filter((d) => d.status === "published")}
                  fill="#3fb950"
                  isAnimationActive={false}
                />
                <Scatter
                  data={scatterData.filter((d) => d.status === "draft")}
                  fill="#f0883e"
                  isAnimationActive={false}
                />
              </RechartsScatter>
            </ResponsiveContainer>
          </div>
        )}

        {draftAging.length > 0 && (
          <div className="card">
            <h2>下書き経過日数</h2>
            <p className="desc">
              現在draftタグが付いているファイルの経過日数。長期間下書きのまま放置されているものを特定する
            </p>
            <ResponsiveContainer width="100%" height={Math.max(200, draftAging.length * 28)}>
              <BarChart data={draftAging} layout="vertical" margin={{ left: 120 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
                <Bar
                  dataKey="days"
                  isAnimationActive={false}
                  fill="#f0883e"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="card full">
          <h2>一覧</h2>
          <p className="desc">全draftエントリの詳細。ヘッダクリックでソート</p>
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort("title")}>Title</th>
                <th onClick={() => handleSort("file")}>File</th>
                <th onClick={() => handleSort("status")}>Status</th>
                <th onClick={() => handleSort("created")}>Created</th>
                <th onClick={() => handleSort("published")}>Published</th>
                <th onClick={() => handleSort("lead_time_days")}>Lead Time (d)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => (
                <tr key={i}>
                  <td className="truncate">{e.title}</td>
                  <td className="truncate">{e.file}</td>
                  <td className={`status-${e.status}`}>{e.status}</td>
                  <td>{e.created.slice(0, 10)}</td>
                  <td>{e.published?.slice(0, 10) ?? ""}</td>
                  <td>{e.lead_time_days ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
