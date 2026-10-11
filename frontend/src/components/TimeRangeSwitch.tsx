import { createPortal } from "react-dom";
import type { TimeRange } from "../types/index.ts";
import { HStack, Text, Button } from "@chakra-ui/react";
import { useTimeRange } from "../hooks/useTimeRange.ts";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "1w", label: "前週" },
  { value: "1m", label: "前月" },
  { value: "3m", label: "3ヶ月" },
  { value: "6m", label: "半年" },
];

export function TimeRangeSwitch({
  range,
  onChange,
  startedAt,
  finishedAt,
}: {
  range: TimeRange;
  onChange: (r: TimeRange) => void;
  startedAt?: string;
  finishedAt?: string;
}) {
  return (
    <HStack gap={3} wrap="wrap">
      <Text fontSize="xs" color="gray.500">集計範囲:</Text>
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          size="xs"
          variant={range === o.value ? "solid" : "outline"}
          colorPalette="blue"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
      {startedAt && (
        <Text fontSize="xs" color="gray.500">
          {startedAt} ~ {finishedAt}
        </Text>
      )}
    </HStack>
  );
}

/** 範囲の日付はページのデータ生成日で決まるので、ページからナビゲーションバーへ描画する */
export function NavTimeRangeSwitch({ startedAt, finishedAt }: { startedAt: string; finishedAt: string }) {
  const { range, setRange, slot } = useTimeRange();
  if (!slot) return null;
  return createPortal(
    <TimeRangeSwitch range={range} onChange={setRange} startedAt={startedAt} finishedAt={finishedAt} />,
    slot,
  );
}
