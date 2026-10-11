import { Text } from "@chakra-ui/react";
import { LayoutPortal } from "./LayoutPortal.tsx";
import { formatGeneratedAt, hoursSince } from "../dates.ts";

/** これより古いデータは、roam の push からデプロイまでのどこかが止まっている */
const STALE_HOURS = 24;

export function GeneratedAt({ generatedAt, now }: { generatedAt: string; now: number }) {
  const hours = hoursSince(generatedAt, now);
  const stale = hours > STALE_HOURS;
  return (
    <Text fontSize="xs" color={stale ? "red.500" : "gray.400"}>
      Generated: {formatGeneratedAt(generatedAt)} ({Math.max(0, Math.floor(hours))}時間前){stale && " — データが更新されていない"}
    </Text>
  );
}

export function FooterGeneratedAt(props: { generatedAt: string; now: number }) {
  return (
    <LayoutPortal to="footer">
      <GeneratedAt {...props} />
    </LayoutPortal>
  );
}
