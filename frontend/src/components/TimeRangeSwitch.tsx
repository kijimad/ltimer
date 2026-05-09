import type { TimeRange } from "../types/index.ts";
import { HStack, Text, Button } from "@chakra-ui/react";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "1w", label: "前週" },
  { value: "1m", label: "前月" },
  { value: "3m", label: "3ヶ月" },
  { value: "6m", label: "半年" },
];

export function TimeRangeSwitch({
  range,
  onChange,
}: {
  range: TimeRange;
  onChange: (r: TimeRange) => void;
}) {
  return (
    <HStack gap={3} mb={4}>
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
    </HStack>
  );
}
