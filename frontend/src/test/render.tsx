import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import type { ReactElement, ReactNode } from "react";

function Wrapper({ children }: { children: ReactNode }) {
  return <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>;
}

export function renderWithChakra(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Wrapper, ...options });
}

export function renderWithRouter(ui: ReactNode, { route = "/" } = {}) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ChakraProvider>
  );
}
