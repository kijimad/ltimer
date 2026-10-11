import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Flex, Box } from "@chakra-ui/react";
import { TimeRangeProvider } from "./TimeRangeProvider.tsx";

const NAV_ITEMS = [
  { to: "/", label: "Tasks", end: true },
  { to: "/draft", label: "Draft" },
  { to: "/activity", label: "Activity" },
  { to: "/help", label: "Help" },
];

export function Layout() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <TimeRangeProvider slot={slot}>
      <Flex
        as="nav"
        direction="row"
        align="center"
        wrap="wrap"
        columnGap={6}
        rowGap={2}
        px={5}
        py={3}
        borderBottom="1px solid"
        borderColor="gray.200"
        bg="white"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <Box
                color={isActive ? "gray.800" : "gray.500"}
                borderBottom={isActive ? "2px solid" : "2px solid transparent"}
                borderColor={isActive ? "blue.500" : "transparent"}
                pb={1}
                fontSize="sm"
                fontWeight="medium"
                _hover={{ color: "gray.800" }}
              >
                {item.label}
              </Box>
            )}
          </NavLink>
        ))}
        <Box ref={setSlot} ml="auto" />
      </Flex>
      <Outlet />
    </TimeRangeProvider>
  );
}
