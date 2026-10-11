import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useState, type ReactElement, type ReactNode } from "react";
import { TimeRangeProvider } from "../components/TimeRangeProvider.tsx";
import { LayoutSlotsContext } from "../hooks/useLayoutSlots.ts";

function Wrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>;
}

/** Layout の外で描画するページにも集計範囲の状態と、ナビ・フッターの描画先を与える */
function LayoutHarness({ children }: { children: ReactNode }) {
  const [nav, setNav] = useState<HTMLElement | null>(null);
  const [footer, setFooter] = useState<HTMLElement | null>(null);
  return (
    <LayoutSlotsContext.Provider value={{ nav, footer }}>
      <TimeRangeProvider>
        <div ref={setNav} />
        {children}
        <div ref={setFooter} />
      </TimeRangeProvider>
    </LayoutSlotsContext.Provider>
  );
}

export function renderWithChakra(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Wrapper, ...options });
}

export function renderWithRouter(ui: ReactNode, { route = "/" } = {}) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter initialEntries={[route]}>
        <LayoutHarness>{ui}</LayoutHarness>
      </MemoryRouter>
    </ChakraProvider>
  );
}
