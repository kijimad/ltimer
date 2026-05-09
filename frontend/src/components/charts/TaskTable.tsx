import { useMemo, useState } from "react";
import { Badge, Box, Table } from "@chakra-ui/react";
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
    <Table.ColumnHeader
      style={{ cursor: "pointer", userSelect: "none" }}
      onClick={() => handleSort(key)}
    >
      {label}
      {sortKey === key ? (asc ? " ▲" : " ▼") : ""}
    </Table.ColumnHeader>
  );

  return (
    <Box overflowX="auto">
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            {th("Task", "title")}
            {th("File", "file")}
            {th("Status", "status")}
            {th("Lead Time(d)", "lead_time_days")}
            {th("Work(min)", "total_minutes")}
            {th("Sessions", "clock_count")}
            {th("Start", "first_clock_in")}
            {th("Last", "last_clock_out")}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sorted.map((t, i) => (
            <Table.Row key={i}>
              <Table.Cell>{t.title}</Table.Cell>
              <Table.Cell>{shortName(t.file)}</Table.Cell>
              <Table.Cell>
                <Badge colorPalette={t.status === "TODO" ? "orange" : t.status === "DONE" ? "green" : "purple"}>
                  {t.status}
                </Badge>
              </Table.Cell>
              <Table.Cell>{t.lead_time_days}</Table.Cell>
              <Table.Cell>{t.total_minutes}</Table.Cell>
              <Table.Cell>{t.clock_count}</Table.Cell>
              <Table.Cell>{t.first_clock_in.slice(0, 10)}</Table.Cell>
              <Table.Cell>{t.last_clock_out.slice(0, 10)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
