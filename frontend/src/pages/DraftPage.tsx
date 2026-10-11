import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart as RechartsScatter, Scatter, CartesianGrid,
} from "recharts";
import {
  Box, Heading, Text, SimpleGrid, Table, Badge,
} from "@chakra-ui/react";
import { useTimeRange, rangeDates } from "../hooks/useTimeRange.ts";
import { NavTimeRangeSwitch } from "../components/TimeRangeSwitch.tsx";
import { SummaryRow } from "../components/SummaryRow.tsx";
import { FooterGeneratedAt } from "../components/GeneratedAt.tsx";
import { useMountTime } from "../hooks/useMountTime.ts";
import { asOfDate, daysBetween } from "../dates.ts";
import { generatedAt } from "../db/queries.ts";
import { draftsInRange, draftAges } from "../db/charts.ts";
import { draftSummary } from "../db/summary.ts";
import { useDatabase } from "../hooks/useDatabase.ts";

export function DraftPage() {
  const { db, error } = useDatabase();
  const { range } = useTimeRange();
  const now = useMountTime();
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

  const generated = useMemo(() => (db ? generatedAt(db) : null), [db]);
  const asOf = generated ? asOfDate(generated) : null;
  const dates = useMemo(() => (asOf ? rangeDates(range, asOf) : null), [range, asOf]);

  const filtered = useMemo(() => (db && dates ? draftsInRange(db, dates.startedAt) : null), [db, dates]);

  const sorted = useMemo(() => {
    if (!filtered) return [];
    return [...filtered].sort((a, b) => {
      const va = a[sortKey as keyof typeof a];
      const vb = b[sortKey as keyof typeof b];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * sortDir;
      return String(va).localeCompare(String(vb)) * sortDir;
    });
  }, [filtered, sortKey, sortDir]);

  const summary = useMemo(() => (db && asOf ? draftSummary(db, asOf, range) : null), [db, asOf, range]);

  if (error) return <Box p={5}>Error: {error}</Box>;
  if (!db || !generated || !asOf || !dates || !filtered || !summary) return <Box p={5}>Loading...</Box>;

  const { startedAt, finishedAt } = dates;

  const published = filtered.filter((e) => e.status === "published" && e.lead_time_days != null);

  const barData = [...published]
    .sort((a, b) => (b.lead_time_days ?? 0) - (a.lead_time_days ?? 0))
    .map((e) => ({
      name: e.title.slice(0, 30),
      days: e.lead_time_days,
    }));

  const scatterData = filtered.map((e) => ({
    title: e.title,
    days: e.status === "published"
      ? (e.lead_time_days ?? 0)
      : daysBetween(e.created, asOf),
    status: e.status,
  }));

  const draftAging = draftAges(db, startedAt, asOf).map((e) => ({ name: e.title.slice(0, 30), days: e.days, file: e.file }));

  return (
    <Box p={5}>
      <Heading size="lg" color="blue.600" mb={5}>Draft Lead Time</Heading>
      <FooterGeneratedAt generatedAt={generated} now={now} />
      <SummaryRow summary={summary} />
      <NavTimeRangeSwitch startedAt={startedAt} finishedAt={finishedAt} />

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={5} mb={5}>
        {barData.length > 0 && (
          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={4} gridColumn="1 / -1">
            <Heading size="sm" color="gray.700" borderBottom="1px solid" borderColor="gray.100" pb={1} mb={2}>公開済みリードタイム (days)</Heading>
            <Text fontSize="xs" color="gray.400" mb={3} lineHeight="tall">
              draftタグ付与から公開(draftタグ除去)までの日数を降順表示。下書き期間が長いほど公開に至るまでの障壁が大きい
            </Text>
            <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 28)}>
              <BarChart data={barData} layout="vertical" margin={{ left: 120 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} interval={0} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0" }} />
                <Bar dataKey="days" fill="#3fb950" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}

        {scatterData.length > 0 && (
          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
            <Heading size="sm" color="gray.700" borderBottom="1px solid" borderColor="gray.100" pb={1} mb={2}>Draft vs Published</Heading>
            <Text fontSize="xs" color="gray.400" mb={3} lineHeight="tall">
              公開済みはリードタイム、下書き中は作成からの経過日数を表示。下書きが公開済みの典型リードタイムを超えていないか確認する
            </Text>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsScatter margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="days" name="Days" unit="d" />
                <YAxis type="category" dataKey="status" allowDuplicatedCategory={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "8px", fontSize: "12px" }}>
                        <div>{d.title}</div>
                        <div>{d.days}d ({d.status === "draft" ? "経過" : "リードタイム"})</div>
                      </div>
                    );
                  }}
                />
                <Scatter
                  name="published"
                  data={scatterData.filter((d) => d.status === "published")}
                  fill="#3fb950"
                  fillOpacity={0.6}
                  isAnimationActive={false}
                />
                <Scatter
                  name="draft"
                  data={scatterData.filter((d) => d.status === "draft")}
                  fill="#f0883e"
                  fillOpacity={0.6}
                  isAnimationActive={false}
                />
              </RechartsScatter>
            </ResponsiveContainer>
          </Box>
        )}

        {draftAging.length > 0 && (
          <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={4}>
            <Heading size="sm" color="gray.700" borderBottom="1px solid" borderColor="gray.100" pb={1} mb={2}>下書き経過日数</Heading>
            <Text fontSize="xs" color="gray.400" mb={3} lineHeight="tall">
              現在draftタグが付いているファイルの経過日数。長期間下書きのまま放置されているものを特定する
            </Text>
            <ResponsiveContainer width="100%" height={Math.max(200, draftAging.length * 28)}>
              <BarChart data={draftAging} layout="vertical" margin={{ left: 120 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} interval={0} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0" }} />
                <Bar
                  dataKey="days"
                  isAnimationActive={false}
                  fill="#f0883e"
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}

        <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="md" p={4} gridColumn="1 / -1">
          <Heading size="sm" color="gray.700" borderBottom="1px solid" borderColor="gray.100" pb={1} mb={2}>一覧</Heading>
          <Text fontSize="xs" color="gray.400" mb={3} lineHeight="tall">全draftエントリの詳細。ヘッダクリックでソート</Text>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("title")}>Title</Table.ColumnHeader>
                <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("file")}>File</Table.ColumnHeader>
                <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("status")}>Status</Table.ColumnHeader>
                <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("created")}>Created</Table.ColumnHeader>
                <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("published")}>Published</Table.ColumnHeader>
                <Table.ColumnHeader cursor="pointer" onClick={() => handleSort("lead_time_days")}>Lead Time (d)</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sorted.map((e, i) => (
                <Table.Row key={i}>
                  <Table.Cell maxW="250px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{e.title}</Table.Cell>
                  <Table.Cell maxW="250px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{e.file}</Table.Cell>
                  <Table.Cell><Badge colorPalette={e.status === "published" ? "green" : "orange"}>{e.status}</Badge></Table.Cell>
                  <Table.Cell>{e.created.slice(0, 10)}</Table.Cell>
                  <Table.Cell>{e.published?.slice(0, 10) ?? ""}</Table.Cell>
                  <Table.Cell>{e.lead_time_days ?? ""}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
