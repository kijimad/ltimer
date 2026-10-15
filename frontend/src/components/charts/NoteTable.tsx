import { useMemo, useState } from "react";
import { Badge, Table } from "@chakra-ui/react";
import type { NoteRepository } from "../../data/repository.ts";
import type { NoteEntry } from "../../types/index.ts";

interface Props {
  repo: NoteRepository;
  startedAt: string;
}

type SortKey = "title" | "tags" | "status" | "created" | "published" | "lead_time_days";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "tags", label: "Tags" },
  { key: "status", label: "Status" },
  { key: "created", label: "Created" },
  { key: "published", label: "Published" },
  { key: "lead_time_days", label: "Lead Time (d)" },
];

const BADGE = { draft: "orange", published: "green" } as const;

/** 値のないものは並びの向きによらず最後にする */
function compare(a: NoteEntry, b: NoteEntry, key: SortKey): number {
  const va = key === "tags" ? a.tags.join(" ") || null : a[key];
  const vb = key === "tags" ? b.tags.join(" ") || null : b[key];
  if (va === null && vb === null) return 0;
  if (va === null) return Infinity;
  if (vb === null) return -Infinity;
  return typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
}

export function NoteTable({ repo, startedAt }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState(-1);
  const notes = useMemo(() => repo.inRange(startedAt), [repo, startedAt]);
  const sorted = useMemo(
    () =>
      [...notes].sort((a, b) => {
        const c = compare(a, b, sortKey);
        return Number.isFinite(c) ? c * sortDir : c;
      }),
    [notes, sortKey, sortDir],
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => d * -1);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  return (
    <Table.Root size="sm">
      <Table.Header>
        <Table.Row>
          {COLUMNS.map((c) => (
            <Table.ColumnHeader key={c.key} cursor="pointer" onClick={() => handleSort(c.key)}>{c.label}</Table.ColumnHeader>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sorted.map((n) => (
          <Table.Row key={n.file}>
            <Table.Cell maxW="300px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={n.file}>{n.title}</Table.Cell>
            <Table.Cell>{n.tags.join(" ")}</Table.Cell>
            <Table.Cell><Badge colorPalette={BADGE[n.status]}>{n.status}</Badge></Table.Cell>
            <Table.Cell>{n.created}</Table.Cell>
            <Table.Cell>{n.published ?? ""}</Table.Cell>
            <Table.Cell>{n.lead_time_days ?? ""}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
