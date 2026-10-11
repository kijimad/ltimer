import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { useState, type ReactElement, type ReactNode } from "react";
import { TimeRangeProvider } from "../components/TimeRangeProvider.tsx";

function Wrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>;
}

/** Layout の外で描画するページにも集計範囲の状態とスイッチの描画先を与える */
function TimeRangeHarness({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <TimeRangeProvider slot={slot}>
      <div ref={setSlot} />
      {children}
    </TimeRangeProvider>
  );
}

export function renderWithChakra(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Wrapper, ...options });
}

export function renderWithRouter(ui: ReactNode, { route = "/" } = {}) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter initialEntries={[route]}>
        <TimeRangeHarness>{ui}</TimeRangeHarness>
      </MemoryRouter>
    </ChakraProvider>
  );
}
