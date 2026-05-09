import type { ReactNode } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";

export function ChartCard({
  title,
  desc,
  full = true,
  children,
}: {
  title: string;
  desc: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      p={4}
      gridColumn={full ? "1 / -1" : undefined}
    >
      <Heading size="sm" color="gray.700" mb={1}>{title}</Heading>
      <Text fontSize="xs" color="gray.400" mb={3} lineHeight="tall">{desc}</Text>
      {children}
    </Box>
  );
}
